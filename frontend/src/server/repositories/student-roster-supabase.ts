import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ListStudentsQuery,
  StudentListResult,
  StudentRosterInput,
} from "@/features/students/student-roster.types";
import type { ClassRow, Enrollment, StudentRecord } from "@/server/domain/types";
import { createCurrentUserSupabaseClient } from "@/server/supabase/user-session-client";
import { buildStudentListResult } from "./student-roster-core";
import { mapRepositoryError } from "./repository-error";

type ClientFactory = () => Promise<SupabaseClient>;

interface StudentRow {
  id: string;
  organization_id: string;
  student_number: string;
  display_name: string;
  gender: "男" | "女" | null;
  status: StudentRecord["status"];
  archived_at: string | null;
  archived_by_profile_id: string | null;
  archive_reason: string | null;
  revision: number;
}

interface StudentProfileRow {
  student_id: string;
  phone: string;
}

interface ClassRowRecord {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  status: string;
  capacity: number | null;
  progress: number;
}

interface EnrollmentRow {
  organization_id: string;
  class_id: string;
  student_id: string;
  status: "active" | "withdrawn";
}

export class SupabaseStudentRosterRepository {
  constructor(private readonly clientFactory: ClientFactory = createCurrentUserSupabaseClient) {}

  async listStudents(query: ListStudentsQuery): Promise<StudentListResult> {
    const client = await this.clientFactory();
    const [studentsResult, profilesResult, classesResult, enrollmentsResult] = await Promise.all([
      client
        .from("students")
        .select(
          "id, organization_id, student_number, display_name, gender, status, archived_at, archived_by_profile_id, archive_reason, revision",
        )
        .eq("organization_id", query.organizationId),
      client
        .from("student_profiles")
        .select("student_id, phone")
        .eq("organization_id", query.organizationId),
      client
        .from("course_classes")
        .select("id, organization_id, name, code, status, capacity, progress")
        .eq("organization_id", query.organizationId),
      client
        .from("class_enrollments")
        .select("organization_id, class_id, student_id, status")
        .eq("organization_id", query.organizationId),
    ]);
    const error =
      studentsResult.error ??
      profilesResult.error ??
      classesResult.error ??
      enrollmentsResult.error;
    if (error) throw mapRepositoryError(error);

    const phoneByStudent = new Map(
      ((profilesResult.data ?? []) as StudentProfileRow[]).map((row) => [
        row.student_id,
        row.phone,
      ]),
    );
    const students: StudentRecord[] = ((studentsResult.data ?? []) as StudentRow[]).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      number: row.student_number,
      name: row.display_name,
      gender: row.gender ?? "女",
      phone: phoneByStudent.get(row.id) ?? "",
      status: row.status,
      archivedAt: row.archived_at ?? undefined,
      archivedBy: row.archived_by_profile_id ?? undefined,
      archiveReason: row.archive_reason ?? undefined,
      revision: row.revision,
    }));
    const classes: ClassRow[] = ((classesResult.data ?? []) as ClassRowRecord[]).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code ?? "",
      grade: "",
      subject: "",
      schedule: "",
      capacity: row.capacity,
      status: row.status,
      teacherName: "",
      students: 0,
      progress: row.progress,
    }));
    const enrollments: Enrollment[] = ((enrollmentsResult.data ?? []) as EnrollmentRow[]).map(
      (row) => ({
        id: `${row.class_id}:${row.student_id}`,
        organizationId: row.organization_id,
        classId: row.class_id,
        studentId: row.student_id,
        status: row.status,
      }),
    );
    return buildStudentListResult(query, { students, classes, enrollments });
  }

  async saveStudent(organizationId: string, input: StudentRosterInput) {
    const client = await this.clientFactory();
    const { data, error } = await client.rpc("save_student_aggregate", {
      target_organization_id: organizationId,
      target_student_id: input.studentId ?? null,
      expected_revision: input.revision ?? null,
      requested_student_number: input.number,
      student_name: input.name,
      student_gender: input.gender,
      requested_student_status: input.status,
      student_phone: input.phone,
      class_ids: input.classIds ?? null,
    });
    if (error) throw mapRepositoryError(error);
    return (data as { student_id: string; revision: number }[] | null)?.[0] ?? null;
  }

  async changeLifecycle(
    organizationId: string,
    studentId: string,
    revision: number,
    intent: "archive" | "restore",
    reason: string,
  ) {
    const client = await this.clientFactory();
    const { data, error } = await client.rpc("change_student_lifecycle", {
      target_organization_id: organizationId,
      target_student_id: studentId,
      expected_revision: revision,
      lifecycle_intent: intent,
      lifecycle_reason: reason || null,
    });
    if (error) throw mapRepositoryError(error);
    return (data as { student_id: string; revision: number; status: string }[] | null)?.[0] ?? null;
  }
}

export const supabaseStudentRosterRepository = new SupabaseStudentRosterRepository();
