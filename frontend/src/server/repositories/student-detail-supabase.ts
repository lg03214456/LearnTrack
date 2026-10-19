import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  AssessmentFilters,
  StudentDetailReadOptions,
} from "@/features/student-profile/student-profile.types";
import type { ClassRow, Enrollment, StudentRecord } from "@/server/domain/types";
import { createCurrentUserSupabaseClient } from "@/server/supabase/user-session-client";
import { buildStudentDetail, type StudentDetailSource } from "./student-detail-core";
import { mapRepositoryError } from "./repository-error";

type ClientFactory = () => Promise<SupabaseClient>;
type Row = Record<string, unknown>;

export class SupabaseStudentDetailRepository {
  constructor(private readonly clientFactory: ClientFactory = createCurrentUserSupabaseClient) {}

  async get(
    actor: AuthorizationContext,
    studentId: string,
    filters: AssessmentFilters,
    options: StudentDetailReadOptions = {},
  ) {
    const client = await this.clientFactory();
    const organizationId = actor.organizationId;
    const includeAssessmentOptions = options.includeAssessmentOptions ?? true;
    const queries = [
      client
        .from("students")
        .select("id, organization_id, student_number, display_name, gender, status, revision")
        .eq("organization_id", organizationId)
        .eq("id", studentId),
      client
        .from("student_profiles")
        .select("student_id, organization_id, phone, school, grade, revision")
        .eq("organization_id", organizationId)
        .eq("student_id", studentId),
      client
        .from("student_contacts")
        .select("id, organization_id, student_id, display_name, relationship_label, phone, status")
        .eq("organization_id", organizationId)
        .eq("student_id", studentId),
      client
        .from("course_classes")
        .select("id, organization_id, name, code, status, capacity, progress")
        .eq("organization_id", organizationId),
      client
        .from("class_enrollments")
        .select("organization_id, class_id, student_id, status")
        .eq("organization_id", organizationId)
        .eq("student_id", studentId),
      client
        .from("assessments")
        .select(
          "id, organization_id, term_id, subject, title, assessment_date, maximum_score, assessment_kind, curriculum_item_id",
        )
        .eq("organization_id", organizationId),
      client
        .from("assessment_results")
        .select(
          "id, organization_id, assessment_id, student_id, score, comment, revision, updated_at, updated_by_profile_id",
        )
        .eq("organization_id", organizationId)
        .eq("student_id", studentId),
    ];
    // The picker is only needed on the assessment tab. Start its lookup alongside
    // the common profile queries rather than adding a serial database round trip.
    const planQuery = includeAssessmentOptions
      ? client
          .from("study_plans")
          .select("id, status, deleted_at")
          .eq("organization_id", organizationId)
          .eq("student_id", studentId)
      : Promise.resolve({ data: [], error: null });
    const [results, planResult] = await Promise.all([Promise.all(queries), planQuery]);
    const error = results.find((result) => result.error)?.error;
    if (error) throw mapRepositoryError(error);
    if (planResult.error) throw mapRepositoryError(planResult.error);
    const tables = [
      "students",
      "student_profiles",
      "student_contacts",
      "course_classes",
      "class_enrollments",
      "assessments",
      "assessment_results",
    ] as const;
    const rows = Object.fromEntries(
      tables.map((table, index) => [table, (results[index].data ?? []) as Row[]]),
    );
    const source: StudentDetailSource = {
      boundAssessmentIds: [],
      students: rows.students.map((row) => ({
        id: String(row.id),
        organizationId: String(row.organization_id),
        number: String(row.student_number),
        name: String(row.display_name),
        gender: (row.gender ?? "女") as StudentRecord["gender"],
        phone: "",
        status: row.status as StudentRecord["status"],
        revision: Number(row.revision ?? 1),
      })),
      profiles: rows.student_profiles.map((row) => ({
        studentId: String(row.student_id),
        organizationId: String(row.organization_id),
        phone: String(row.phone ?? ""),
        school: String(row.school ?? ""),
        grade: String(row.grade ?? ""),
        revision: Number(row.revision),
      })),
      guardians: rows.student_contacts
        .filter((row) => row.status === "active")
        .map((row) => ({
          id: String(row.id),
          organizationId: String(row.organization_id),
          studentId: String(row.student_id),
          name: String(row.display_name ?? ""),
          relationship: String(row.relationship_label),
          phone: String(row.phone ?? ""),
        })),
      classes: rows.course_classes.map((row) => ({
        id: String(row.id),
        organizationId: String(row.organization_id),
        name: String(row.name),
        code: String(row.code ?? ""),
        grade: "",
        subject: "",
        schedule: "",
        capacity: row.capacity === null ? null : Number(row.capacity),
        status: String(row.status),
        teacherName: "",
        students: 0,
        progress: Number(row.progress ?? 0),
      })) as ClassRow[],
      enrollments: rows.class_enrollments.map((row) => ({
        id: `${String(row.class_id)}:${String(row.student_id)}`,
        organizationId: String(row.organization_id),
        classId: String(row.class_id),
        studentId: String(row.student_id),
        status: row.status as Enrollment["status"],
      })),
      assessments: rows.assessments.map((row) => ({
        id: String(row.id),
        organizationId: String(row.organization_id),
        termId: String(row.term_id),
        subject: String(row.subject),
        title: String(row.title),
        date: String(row.assessment_date),
        maximumScore: Number(row.maximum_score),
      })),
      results: rows.assessment_results.map((row) => ({
        id: String(row.id),
        organizationId: String(row.organization_id),
        assessmentId: String(row.assessment_id),
        studentId: String(row.student_id),
        score: Number(row.score),
        comment: String(row.comment ?? ""),
        revision: Number(row.revision),
        updatedAt: String(row.updated_at),
        updatedBy: String(row.updated_by_profile_id ?? ""),
      })),
      sessions: [],
      terms: [...new Set(rows.assessments.map((row) => String(row.term_id)))].map((id) => ({
        id,
        name: id,
      })),
    };
    source.students.forEach((student) => {
      student.phone =
        source.profiles.find((profile) => profile.studentId === student.id)?.phone ?? "";
    });
    const activePlanIds = new Set(
      ((planResult.data ?? []) as Row[])
        .filter((plan) => plan.status === "active" && !plan.deleted_at)
        .map((plan) => String(plan.id)),
    );
    if (activePlanIds.size) {
      const itemResult = await client
        .from("student_learning_items")
        .select("study_plan_id, source_item_id, item_type, status")
        .eq("organization_id", organizationId)
        .in("study_plan_id", [...activePlanIds]);
      if (itemResult.error) throw mapRepositoryError(itemResult.error);
      const boundItemIds = new Set(
        ((itemResult.data ?? []) as Row[])
          .filter(
            (item) =>
              item.item_type === "assessment" &&
              !["removed", "skipped"].includes(String(item.status)),
          )
          .map((item) => String(item.source_item_id)),
      );
      source.boundAssessmentIds = rows.assessments
        .filter(
          (assessment) =>
            assessment.assessment_kind === "curriculum" &&
            boundItemIds.has(String(assessment.curriculum_item_id)),
        )
        .map((assessment) => String(assessment.id));
    }
    return buildStudentDetail(actor, studentId, filters, source);
  }

  async saveProfile(
    actor: AuthorizationContext,
    input: {
      studentId: string;
      guardianId: string;
      revision: number;
      phone: string;
      school: string;
      grade: string;
      guardianName: string;
      guardianPhone: string;
    },
  ) {
    const client = await this.clientFactory();
    const { data, error } = await client.rpc("save_student_detail_profile", {
      target_organization_id: actor.organizationId,
      target_student_id: input.studentId,
      target_contact_id: input.guardianId,
      expected_revision: input.revision,
      student_phone: input.phone,
      student_school: input.school,
      student_grade: input.grade,
      contact_name: input.guardianName,
      contact_phone: input.guardianPhone,
    });
    if (error) throw mapRepositoryError(error);
    return data;
  }

  async recordResult(
    actor: AuthorizationContext,
    input: { studentId: string; assessmentId: string; score: number; comment: string },
  ) {
    const client = await this.clientFactory();
    const { data, error } = await client.rpc("record_assessment_result", {
      target_organization_id: actor.organizationId,
      target_student_id: input.studentId,
      target_assessment_id: input.assessmentId,
      result_score: input.score,
      result_comment: input.comment,
    });
    if (error) throw mapRepositoryError(error);
    return data;
  }

  async recordExtraResult(
    actor: AuthorizationContext,
    input: {
      studentId: string;
      termId: string;
      subject: string;
      title: string;
      date: string;
      maximumScore: number;
      score: number;
      comment: string;
    },
  ) {
    const client = await this.clientFactory();
    const { data, error } = await client.rpc("record_extra_assessment_result", {
      target_organization_id: actor.organizationId,
      target_student_id: input.studentId,
      target_term_id: input.termId,
      target_subject: input.subject,
      assessment_title: input.title,
      assessment_date: input.date,
      assessment_maximum_score: input.maximumScore,
      result_score: input.score,
      result_comment: input.comment,
    });
    if (error) throw mapRepositoryError(error);
    return data;
  }

  async correctResult(
    actor: AuthorizationContext,
    input: { resultId: string; revision: number; score: number; comment: string },
  ) {
    const client = await this.clientFactory();
    const { data, error } = await client.rpc("correct_assessment_result", {
      target_organization_id: actor.organizationId,
      target_result_id: input.resultId,
      expected_revision: input.revision,
      result_score: input.score,
      result_comment: input.comment,
    });
    if (error) throw mapRepositoryError(error);
    return data;
  }
}

export const supabaseStudentDetailRepository = new SupabaseStudentDetailRepository();
