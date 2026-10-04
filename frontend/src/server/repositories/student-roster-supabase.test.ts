import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseStudentRosterRepository } from "./student-roster-supabase";

function clientWith(dataByTable: Record<string, unknown[]>, rpc = vi.fn()) {
  return {
    from(table: string) {
      const result = { data: dataByTable[table] ?? [], error: null };
      const query = {
        select: () => query,
        eq: () => query,
        neq: () => query,
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
    rpc,
  } as unknown as SupabaseClient;
}

describe("Supabase student roster repository", () => {
  it("maps tenant rows through the shared student roster contract", async () => {
    const client = clientWith({
      students: [
        {
          id: "student-a",
          organization_id: "org-a",
          student_number: "A001",
          display_name: "測試學生",
          gender: "女",
          status: "active",
          archived_at: null,
          archived_by_profile_id: null,
          archive_reason: null,
          revision: 3,
        },
      ],
      student_profiles: [{ student_id: "student-a", phone: "0912-345-678" }],
      course_classes: [
        {
          id: "class-a",
          organization_id: "org-a",
          name: "測試班",
          code: "A",
          status: "active",
          capacity: 10,
          progress: 0,
        },
      ],
      class_enrollments: [
        {
          organization_id: "org-a",
          class_id: "class-a",
          student_id: "student-a",
          status: "active",
        },
      ],
    });
    const repository = new SupabaseStudentRosterRepository(async () => client);
    const result = await repository.listStudents({
      organizationId: "org-a",
      page: 1,
      pageSize: 20,
    });

    expect(result.rows[0]).toMatchObject({
      id: "student-a",
      phone: "0912-345-678",
      revision: 3,
      classes: [{ classId: "class-a", className: "測試班" }],
    });
  });

  it("sends writes through the atomic student RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: [{ student_id: "student-a", revision: 1 }],
      error: null,
    }));
    const repository = new SupabaseStudentRosterRepository(async () => clientWith({}, rpc));
    await repository.saveStudent("org-a", {
      number: "A001",
      name: "測試學生",
      gender: "女",
      phone: "0912-345-678",
      status: "active",
      classIds: ["class-a"],
    });

    expect(rpc).toHaveBeenCalledWith(
      "save_student_aggregate",
      expect.objectContaining({ target_organization_id: "org-a", class_ids: ["class-a"] }),
    );
  });
});
