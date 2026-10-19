import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(import.meta.dirname, "../supabase/migrations/202610100002_curriculum_functions.sql"),
  "utf8",
);
describe("curriculum SQL contracts (static only, not live RLS)", () => {
  it("uses authenticated permission and student scope with no direct REST writes", () => {
    expect(sql).toContain("private.has_permission");
    expect(sql).toContain("private.can_access_student");
    expect(sql).toContain("revoke insert, update, delete on public.curriculum_templates");
    expect(sql).not.toMatch(/grant[^;]+to anon/i);
    expect(sql).toContain("from public, anon");
  });
  it("releases the unique active-plan slot before inserting a replacement", () => {
    const replacement = sql
      .split("create or replace function public.replace_student_study_plan")[1]
      .split("create or replace function public.mutate_curriculum_workspace")[0];
    expect(replacement.indexOf("set status = 'replaced'")).toBeLessThan(
      replacement.indexOf("insert into public.study_plans"),
    );
    expect(replacement).toContain("for update");
    expect(replacement).toContain("c.lineage_id = i.lineage_id and c.status = 'completed'");
    expect(replacement).toContain("i.status not in ('completed', 'removed')");
    expect(replacement).not.toContain("delete from");
  });
  it("protects published versions and conflicting item edits", () => {
    expect(sql).toContain("expected_revision <> selected_version.revision");
    expect(sql).toContain("PUBLISHED_VERSION_IMMUTABLE");
    expect(sql).toContain("expected_revision <> selected_learning_item.revision");
    expect(sql).toContain("selected_plan.status <> 'active'");
    expect(sql).toContain("selected_learning_item.status = 'removed'");
  });
  it("reorders with complete unique identifiers and disjoint temporary positions", () => {
    expect(sql).toContain("count(distinct x)");
    expect(sql).toContain("ordered_ids <@ old_ids and old_ids <@ ordered_ids");
    expect(sql.indexOf("position = i.position + offset_position")).toBeLessThan(
      sql.indexOf("position = x.ordinality - 1"),
    );
    expect(sql).not.toContain("exception when");
  });
  it("returns only one student's nondeleted plan history and tenant-filtered records", () => {
    expect(sql).toContain("p.student_id = target_student_id and p.deleted_at is null");
    expect(sql).toContain("v.id = any(selected_version_ids)");
    expect(sql).toContain("s.display_name");
    expect(sql).toContain("s.organization_id = target_organization_id");
  });
});
