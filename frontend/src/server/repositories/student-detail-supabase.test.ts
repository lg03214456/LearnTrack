import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { SupabaseStudentDetailRepository } from "./student-detail-supabase";

function clientWith(dataByTable: Record<string, unknown[]>, rpc = vi.fn()) {
  const filters: Array<[string, string, unknown]> = [];
  const selections: Array<[string, string]> = [];
  return {
    filters,
    selections,
    client: {
      from(table: string) {
        const result = { data: dataByTable[table] ?? [], error: null };
        const query = {
          select: (columns: string) => {
            selections.push([table, columns]);
            return query;
          },
          eq: (column: string, value: unknown) => {
            filters.push([table, column, value]);
            return query;
          },
          then: (resolve: (value: typeof result) => unknown) =>
            Promise.resolve(result).then(resolve),
        };
        return query;
      },
      rpc,
    } as unknown as SupabaseClient,
  };
}

describe("Supabase student detail repository", () => {
  it("maps profile, contact, class, and assessment rows within the actor organization", async () => {
    const stub = clientWith({
      students: [
        {
          id: "stu-1",
          organization_id: "org-001",
          student_number: "S001",
          display_name: "學生",
          gender: "女",
          status: "active",
          revision: 1,
        },
      ],
      student_profiles: [
        {
          student_id: "stu-1",
          organization_id: "org-001",
          phone: "0912",
          school: "測試國中",
          grade: "國二",
          revision: 2,
        },
      ],
      student_contacts: [
        {
          id: "16e50b4c-3ed7-4ac0-a14f-57664abcf69e",
          organization_id: "org-001",
          student_id: "stu-1",
          display_name: "家長",
          relationship_label: "母親",
          phone: "0988",
          status: "active",
        },
      ],
      course_classes: [
        {
          id: "cls-1",
          organization_id: "org-001",
          name: "數學班",
          code: "M",
          status: "active",
          capacity: 10,
          progress: 20,
        },
      ],
      class_enrollments: [
        {
          id: "enroll-1",
          organization_id: "org-001",
          class_id: "cls-1",
          student_id: "stu-1",
          status: "active",
        },
      ],
      assessments: [
        {
          id: "exam-1",
          organization_id: "org-001",
          term_id: "115-1",
          subject: "數學",
          title: "小考",
          assessment_date: "2026-10-01",
          maximum_score: 100,
        },
      ],
      assessment_results: [
        {
          id: "result-1",
          organization_id: "org-001",
          assessment_id: "exam-1",
          student_id: "stu-1",
          score: 88,
          comment: "穩定",
          revision: 1,
          updated_at: "2026-10-01T00:00:00Z",
          updated_by_profile_id: "teacher",
        },
      ],
    });
    const repository = new SupabaseStudentDetailRepository(async () => stub.client);
    const detail = await repository.get(resolveMockIdentity("owner"), "stu-1", {
      page: 1,
      pageSize: 20,
    });

    expect(detail?.profile).toMatchObject({
      name: "學生",
      phone: "0912",
      school: "測試國中",
      guardians: [{ name: "家長", phone: "0988" }],
    });
    expect(detail?.assessment.rows[0]).toMatchObject({ score: 88, percentage: 88 });
    expect(stub.filters.filter(([, column]) => column === "organization_id")).toHaveLength(7);
    expect(stub.filters).toEqual(
      expect.arrayContaining([
        ["students", "id", "stu-1"],
        ["student_profiles", "student_id", "stu-1"],
        ["student_contacts", "student_id", "stu-1"],
        ["class_enrollments", "student_id", "stu-1"],
        ["assessment_results", "student_id", "stu-1"],
      ]),
    );
    expect(stub.selections).toContainEqual([
      "class_enrollments",
      "organization_id, class_id, student_id, status",
    ]);
  });

  it("routes profile and result writes through atomic RPCs", async () => {
    const rpc = vi.fn(async () => ({ data: [{ revision: 2 }], error: null }));
    const stub = clientWith({}, rpc);
    const repository = new SupabaseStudentDetailRepository(async () => stub.client);
    const actor = resolveMockIdentity("teacher");
    await repository.saveProfile(actor, {
      studentId: "stu-1",
      guardianId: "16e50b4c-3ed7-4ac0-a14f-57664abcf69e",
      revision: 1,
      phone: "0912",
      school: "學校",
      grade: "國二",
      guardianName: "家長",
      guardianPhone: "0988",
    });
    await repository.recordResult(actor, {
      studentId: "stu-1",
      assessmentId: "exam-1",
      score: 80,
      comment: "",
    });
    await repository.correctResult(actor, {
      resultId: "result-1",
      revision: 1,
      score: 90,
      comment: "複核",
    });

    expect(rpc).toHaveBeenNthCalledWith(
      1,
      "save_student_detail_profile",
      expect.objectContaining({ target_organization_id: "org-001", expected_revision: 1 }),
    );
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      "record_assessment_result",
      expect.objectContaining({ target_student_id: "stu-1", result_score: 80 }),
    );
    expect(rpc).toHaveBeenNthCalledWith(
      3,
      "correct_assessment_result",
      expect.objectContaining({ target_result_id: "result-1", expected_revision: 1 }),
    );
  });
});
