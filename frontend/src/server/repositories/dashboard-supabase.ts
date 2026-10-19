import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Analytics } from "@/features/analytics/analytics.types";
import type { ProgressRow, ProgressStatus } from "@/features/progress/progress.types";
import { createCurrentUserSupabaseClient } from "@/server/supabase/user-session-client";
import { mapRepositoryError } from "./repository-error";

type ClientFactory = () => Promise<SupabaseClient>;
type Row = Record<string, unknown>;

const statusFor = (progress: number): ProgressStatus =>
  progress >= 80 ? "ahead" : progress >= 60 ? "normal" : "behind";

export class SupabaseDashboardRepository {
  constructor(private readonly clientFactory: ClientFactory = createCurrentUserSupabaseClient) {}

  async progress(organizationId: string, classIds?: string[]): Promise<ProgressRow[]> {
    const client = await this.clientFactory();
    const [progressResult, sessionsResult, studentsResult, classesResult, resultsResult] =
      await Promise.all([
        client.from("student_session_progress").select("*").eq("organization_id", organizationId),
        client.from("class_sessions").select("id, class_id").eq("organization_id", organizationId),
        client
          .from("students")
          .select("id, student_number, display_name")
          .eq("organization_id", organizationId),
        client.from("course_classes").select("id, name").eq("organization_id", organizationId),
        client
          .from("assessment_results")
          .select("student_id, score")
          .eq("organization_id", organizationId),
      ]);
    const error = [
      progressResult,
      sessionsResult,
      studentsResult,
      classesResult,
      resultsResult,
    ].find((result) => result.error)?.error;
    if (error) throw mapRepositoryError(error);

    const records = (progressResult.data ?? []) as Row[];
    const supersededIds = new Set(
      records
        .map((row) => row.supersedes_id)
        .filter(Boolean)
        .map(String),
    );
    const currentRecords = records.filter((row) => !supersededIds.has(String(row.id)));
    const sessions = (sessionsResult.data ?? []) as Row[];
    const students = (studentsResult.data ?? []) as Row[];
    const classes = (classesResult.data ?? []) as Row[];
    const assessmentResults = (resultsResult.data ?? []) as Row[];
    const groups = new Map<string, Row[]>();

    for (const record of currentRecords) {
      const session = sessions.find((row) => row.id === record.class_session_id);
      if (!session || (classIds && !classIds.includes(String(session.class_id)))) continue;
      const key = `${String(record.student_id)}:${String(session.class_id)}`;
      groups.set(key, [...(groups.get(key) ?? []), { ...record, class_id: session.class_id }]);
    }

    return [...groups.values()].map((rows) => {
      const studentId = String(rows[0].student_id);
      const classId = String(rows[0].class_id);
      const student = students.find((row) => row.id === studentId);
      const courseClass = classes.find((row) => row.id === classId);
      const latestByItem = new Map<string, Row>();
      for (const row of rows) {
        const key = String(row.learning_item_id);
        const current = latestByItem.get(key);
        if (!current || String(row.recorded_at) > String(current.recorded_at))
          latestByItem.set(key, row);
      }
      const items = [...latestByItem.values()];
      const completed = items.filter((row) => row.status_after_session === "completed").length;
      const total = items.length;
      const progress = total ? Math.round((completed / total) * 100) : 0;
      const scores = assessmentResults
        .filter((row) => row.student_id === studentId)
        .map((row) => Number(row.score));
      const recent =
        rows
          .map((row) => String(row.recorded_at))
          .sort()
          .at(-1)
          ?.slice(0, 10) ?? "";
      return {
        studentId,
        classId,
        name: String(student?.display_name ?? "未知學生"),
        number: String(student?.student_number ?? ""),
        className: String(courseClass?.name ?? "未知班級"),
        progress,
        completed,
        total,
        score: scores.length
          ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
          : 0,
        status: statusFor(progress),
        recent,
      };
    });
  }

  async analytics(organizationId: string, classIds?: string[]): Promise<Analytics> {
    const client = await this.clientFactory();
    const [progressRows, classesResult, assessmentsResult, resultsResult, assignmentsResult] =
      await Promise.all([
        this.progress(organizationId, classIds),
        client.from("course_classes").select("id, name").eq("organization_id", organizationId),
        client
          .from("assessments")
          .select("id, class_id, assessment_date, maximum_score")
          .eq("organization_id", organizationId),
        client
          .from("assessment_results")
          .select("assessment_id, student_id, score")
          .eq("organization_id", organizationId),
        client
          .from("class_assignments")
          .select("class_id, membership_id")
          .eq("organization_id", organizationId)
          .eq("status", "active"),
      ]);
    const initialError = [classesResult, assessmentsResult, resultsResult, assignmentsResult].find(
      (result) => result.error,
    )?.error;
    if (initialError) throw mapRepositoryError(initialError);

    const allClasses = (classesResult.data ?? []) as Row[];
    const classes = classIds
      ? allClasses.filter((row) => classIds.includes(String(row.id)))
      : allClasses;
    const visibleClassIds = new Set(classes.map((row) => String(row.id)));
    const assessments = ((assessmentsResult.data ?? []) as Row[]).filter(
      (row) => row.class_id && visibleClassIds.has(String(row.class_id)),
    );
    const assessmentById = new Map(assessments.map((row) => [String(row.id), row]));
    const normalizedResults = ((resultsResult.data ?? []) as Row[])
      .map((row) => {
        const assessment = assessmentById.get(String(row.assessment_id));
        if (!assessment) return null;
        const maximum = Number(assessment.maximum_score);
        const score = Number(row.score);
        if (!Number.isFinite(maximum) || maximum <= 0 || !Number.isFinite(score)) return null;
        return {
          assessmentId: String(row.assessment_id),
          classId: String(assessment.class_id),
          studentId: String(row.student_id),
          date: String(assessment.assessment_date),
          percentage: Math.round((score / maximum) * 1000) / 10,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const membershipIds = [
      ...new Set(
        ((assignmentsResult.data ?? []) as Row[])
          .filter((row) => visibleClassIds.has(String(row.class_id)))
          .map((row) => String(row.membership_id)),
      ),
    ];
    const membershipsResult = membershipIds.length
      ? await client
          .from("organization_memberships")
          .select("id, profile_id")
          .eq("organization_id", organizationId)
          .in("id", membershipIds)
      : { data: [] as Row[], error: null };
    if (membershipsResult.error) throw mapRepositoryError(membershipsResult.error);
    const memberships = (membershipsResult.data ?? []) as Row[];
    const profileIds = [...new Set(memberships.map((row) => String(row.profile_id)))];
    const profilesResult = profileIds.length
      ? await client.from("profiles").select("id, display_name").in("id", profileIds)
      : { data: [] as Row[], error: null };
    if (profilesResult.error) throw mapRepositoryError(profilesResult.error);
    const profiles = (profilesResult.data ?? []) as Row[];
    const assignments = (assignmentsResult.data ?? []) as Row[];

    const average = (values: number[]) =>
      values.length
        ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
        : null;
    const studentScores = new Map<string, number[]>();
    for (const result of normalizedResults)
      studentScores.set(result.studentId, [
        ...(studentScores.get(result.studentId) ?? []),
        result.percentage,
      ]);
    const studentScoreAverages = new Map(
      [...studentScores].map(([studentId, scores]) => [studentId, average(scores)!]),
    );
    const atRiskStudentIds = new Set(
      progressRows.filter((row) => row.progress < 60).map((row) => row.studentId),
    );
    for (const [studentId, score] of studentScoreAverages)
      if (score < 60) atRiskStudentIds.add(studentId);

    const monthScores = new Map<string, number[]>();
    for (const result of normalizedResults) {
      const month = result.date.slice(0, 7);
      monthScores.set(month, [...(monthScores.get(month) ?? []), result.percentage]);
    }
    const scoreValues = normalizedResults.map((result) => result.percentage);
    const bandDefinitions = [
      ["90–100分（優異）", 90, 101, "#155e75"],
      ["80–89分（良好）", 80, 90, "#3b82f6"],
      ["70–79分（中等）", 70, 80, "#64748b"],
      ["60–69分（及格）", 60, 70, "#f59e0b"],
      ["60分以下（需加強）", -Infinity, 60, "#dc2626"],
    ] as const;

    return {
      hasData: progressRows.length > 0 || normalizedResults.length > 0,
      averageScore: average(scoreValues),
      completion: average(progressRows.map((row) => row.progress)),
      participation: new Set([
        ...progressRows.map((row) => row.studentId),
        ...normalizedResults.map((row) => row.studentId),
      ]).size,
      excellentStudents: [...studentScoreAverages.values()].filter((score) => score >= 90).length,
      atRisk: atRiskStudentIds.size,
      trend: [...monthScores]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([month, scores]) => ({ month, score: average(scores)! })),
      bands: bandDefinitions.map(([label, minimum, maximum, color]) => ({
        label,
        value: scoreValues.length
          ? Math.round(
              (scoreValues.filter((score) => score >= minimum && score < maximum).length /
                scoreValues.length) *
                100,
            )
          : 0,
        color,
      })),
      classes: classes.map((courseClass) => {
        const classId = String(courseClass.id);
        const classProgress = progressRows
          .filter((row) => row.classId === classId)
          .map((row) => row.progress);
        const classScores = normalizedResults
          .filter((result) => result.classId === classId)
          .map((result) => result.percentage);
        const progress = average(classProgress);
        const score = average(classScores);
        const assignment = assignments.find((row) => String(row.class_id) === classId);
        const membership = memberships.find(
          (row) => String(row.id) === String(assignment?.membership_id),
        );
        const profile = profiles.find((row) => String(row.id) === String(membership?.profile_id));
        return {
          name: String(courseClass.name),
          teacher: String(profile?.display_name ?? "未指派"),
          progress,
          score,
          status:
            progress === null && score === null
              ? "尚無紀錄"
              : (progress !== null && progress < 60) || (score !== null && score < 60)
                ? "需多關注"
                : "穩定正常",
        };
      }),
    };
  }
}

export const supabaseDashboardRepository = new SupabaseDashboardRepository();
