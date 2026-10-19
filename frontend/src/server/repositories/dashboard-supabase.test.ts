import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { SupabaseDashboardRepository } from "./dashboard-supabase";

function clientWith(dataByTable: Record<string, unknown[]>) {
  const filters: Array<[string, string, unknown]> = [];
  const client = {
    from(table: string) {
      const result = { data: dataByTable[table] ?? [], error: null };
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          filters.push([table, column, value]);
          return query;
        },
        in: () => query,
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
  } as unknown as SupabaseClient;
  return { client, filters };
}

describe("Supabase dashboard progress repository", () => {
  it("returns an empty list when the organization has no durable progress", async () => {
    const stub = clientWith({});
    const repository = new SupabaseDashboardRepository(async () => stub.client);

    await expect(repository.progress("org-a")).resolves.toEqual([]);
    expect(
      stub.filters.every(([, column, value]) => column === "organization_id" && value === "org-a"),
    ).toBe(true);
  });

  it("returns empty analytics instead of preset values when no durable records exist", async () => {
    const stub = clientWith({ course_classes: [{ id: "class-a", name: "測試班" }] });
    const repository = new SupabaseDashboardRepository(async () => stub.client);

    await expect(repository.analytics("org-a")).resolves.toMatchObject({
      hasData: false,
      averageScore: null,
      completion: null,
      excellentStudents: 0,
      atRisk: 0,
      trend: [],
      classes: [
        {
          name: "測試班",
          progress: null,
          score: null,
          status: "尚無紀錄",
        },
      ],
    });
  });

  it("derives analytics from persisted assessments and progress", async () => {
    const stub = clientWith({
      student_session_progress: [
        {
          id: "p1",
          class_session_id: "session-a",
          student_id: "student-a",
          learning_item_id: "item-a",
          status_after_session: "completed",
          recorded_at: "2026-10-01T00:00:00Z",
        },
      ],
      class_sessions: [{ id: "session-a", class_id: "class-a" }],
      students: [{ id: "student-a", student_number: "STU-0001", display_name: "學生甲" }],
      course_classes: [{ id: "class-a", name: "測試班" }],
      assessments: [
        {
          id: "assessment-a",
          class_id: "class-a",
          assessment_date: "2026-10-02",
          maximum_score: 100,
        },
      ],
      assessment_results: [{ assessment_id: "assessment-a", student_id: "student-a", score: 90 }],
      class_assignments: [],
    });
    const repository = new SupabaseDashboardRepository(async () => stub.client);

    await expect(repository.analytics("org-a")).resolves.toMatchObject({
      hasData: true,
      averageScore: 90,
      completion: 100,
      excellentStudents: 1,
      atRisk: 0,
      trend: [{ month: "2026-10", score: 90 }],
      classes: [{ name: "測試班", progress: 100, score: 90, status: "穩定正常" }],
    });
  });

  it("derives current completion and excludes superseded records", async () => {
    const stub = clientWith({
      student_session_progress: [
        {
          id: "p1",
          organization_id: "org-a",
          class_session_id: "s1",
          student_id: "stu-1",
          learning_item_id: "item-1",
          status_after_session: "pending",
          recorded_at: "2026-10-01T00:00:00Z",
          supersedes_id: null,
        },
        {
          id: "p2",
          organization_id: "org-a",
          class_session_id: "s1",
          student_id: "stu-1",
          learning_item_id: "item-1",
          status_after_session: "completed",
          recorded_at: "2026-10-02T00:00:00Z",
          supersedes_id: "p1",
        },
        {
          id: "p3",
          organization_id: "org-a",
          class_session_id: "s1",
          student_id: "stu-1",
          learning_item_id: "item-2",
          status_after_session: "in_progress",
          recorded_at: "2026-10-03T00:00:00Z",
          supersedes_id: null,
        },
      ],
      class_sessions: [{ id: "s1", class_id: "class-a" }],
      students: [{ id: "stu-1", student_number: "A001", display_name: "測試學生" }],
      course_classes: [{ id: "class-a", name: "測試班" }],
      assessment_results: [
        { student_id: "stu-1", score: 80 },
        { student_id: "stu-1", score: 90 },
      ],
    });
    const repository = new SupabaseDashboardRepository(async () => stub.client);

    await expect(repository.progress("org-a", ["class-a"])).resolves.toEqual([
      expect.objectContaining({
        studentId: "stu-1",
        className: "測試班",
        completed: 1,
        total: 2,
        progress: 50,
        score: 85,
        status: "behind",
        recent: "2026-10-03",
      }),
    ]);
  });
});
