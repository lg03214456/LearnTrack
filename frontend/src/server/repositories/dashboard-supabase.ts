import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
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
}

export const supabaseDashboardRepository = new SupabaseDashboardRepository();
