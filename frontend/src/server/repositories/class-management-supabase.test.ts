import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { SupabaseClassManagementRepository } from "./class-management-supabase";

function clientWith(dataByTable: Record<string, unknown[]>, rpc = vi.fn()) {
  return {
    from(table: string) {
      const result = { data: dataByTable[table] ?? [], error: null };
      const query = {
        select: () => query,
        eq: () => query,
        neq: () => query,
        in: () => query,
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
    rpc,
  } as unknown as SupabaseClient;
}

const source = {
  course_classes: [
    {
      id: "class-a",
      name: "數學班",
      code: "MATH-A",
      class_type: "study",
      capacity: 12,
      status: "active",
      progress: 25,
      revision: 2,
    },
  ],
  class_subjects: [{ class_id: "class-a", subject_code: "math" }],
  class_grade_scopes: [{ class_id: "class-a", grade_code: "j1" }],
  class_schedules: [
    { class_id: "class-a", weekday: 2, starts_at: "18:30:00", ends_at: "20:00:00", room: "201" },
  ],
  class_assignments: [{ class_id: "class-a", membership_id: "membership-teacher" }],
  class_enrollments: [{ class_id: "class-a", student_id: "student-a" }],
  students: [{ id: "student-a", display_name: "學生甲", student_number: "A001" }],
  organization_memberships: [{ id: "membership-teacher", profile_id: "profile-teacher" }],
  profiles: [{ id: "profile-teacher", display_name: "王老師" }],
  subjects: [
    { code: "math", name: "數學", class_code_prefix: "MAT", position: 10, status: "active" },
  ],
};

describe("Supabase class management repository", () => {
  it("maps a complete class aggregate for list and editor views", async () => {
    const repository = new SupabaseClassManagementRepository(async () => clientWith(source));
    const actor = resolveMockIdentity("owner");
    const [rows, editor] = await Promise.all([
      repository.list(actor),
      repository.editor(actor, "class-a"),
    ]);

    expect(rows[0]).toMatchObject({
      id: "class-a",
      type: "study",
      subjects: ["數學"],
      grades: ["國一"],
      teacherName: "王老師",
      studentCount: 1,
      revision: 2,
    });
    expect(editor?.initial).toMatchObject({
      classId: "class-a",
      teacherId: "membership-teacher",
      studentIds: ["student-a"],
    });
  });

  it("sends the complete aggregate through one RPC", async () => {
    const rpc = vi.fn(async () => ({ data: [{ class_id: "class-a", revision: 1 }], error: null }));
    const repository = new SupabaseClassManagementRepository(async () => clientWith({}, rpc));
    await repository.save(resolveMockIdentity("owner"), {
      name: "數學班",
      code: "MATH-A",
      type: "study",
      subjectIds: ["math"],
      gradeIds: ["j1"],
      allGrades: false,
      teacherId: "membership-teacher",
      capacity: 12,
      status: "active",
      schedules: [{ weekday: 2, startTime: "18:30", endTime: "20:00", room: "201" }],
      studentIds: ["student-a"],
    });

    expect(rpc).toHaveBeenCalledWith(
      "save_class_aggregate",
      expect.objectContaining({
        target_organization_id: expect.any(String),
        class_code: "MATH-A",
        requested_class_type: "study",
        student_ids: ["student-a"],
      }),
    );
  });
});
