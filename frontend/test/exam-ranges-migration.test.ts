import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const sql = readFileSync(
  resolve("supabase/migrations/202610160001_student_exam_ranges.sql"),
  "utf8",
);
describe("student exam range migration", () => {
  it("enforces student and plan membership at the database boundary", () => {
    expect(sql).toContain("foreign key (range_id, organization_id, student_id)");
    expect(sql).toContain("foreign key (study_plan_id, organization_id, student_id)");
    expect(sql).toContain("foreign key (learning_item_id, organization_id, study_plan_id)");
  });
  it("enables RLS and limits direct writes and public RPC access", () => {
    for (const table of ["student_exam_ranges", "student_exam_range_items"])
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain(
      "revoke all on function public.save_student_exam_range(text, jsonb) from public, anon",
    );
    expect(sql).toContain("'study_plans.manage'");
    expect(sql).toContain("'study_plans.read'");
  });
  it("locks before writes and rejects stale revisions rather than upserting", () => {
    expect(sql.indexOf("from public.students s")).toBeLessThan(
      sql.indexOf("insert into public.student_exam_ranges"),
    );
    expect(sql).toContain("previous_range.revision <> expected_revision");
    expect(sql).toContain("errcode = '40001'");
    expect(sql).not.toMatch(/update public\.(student_learning_items|study_plans) set/);
    expect(sql).not.toContain("service_role");
  });
});
