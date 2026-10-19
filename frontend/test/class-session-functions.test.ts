import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(import.meta.dirname, "../supabase/migrations/202610100001_class_session_functions.sql"),
  "utf8",
);
describe("daily classroom SQL contracts (static only, not live RLS)", () => {
  it("uses authenticated membership scope on both RPC boundaries", () => {
    expect(sql).toContain("private.can_access_class");
    expect(sql).toContain("private.can_access_student");
    expect(sql).toContain("profile_id text := private.current_profile_id()");
    expect(sql).toContain("from public, anon");
    expect(sql).not.toMatch(/grant[^;]+to anon/i);
  });
  it("snapshots roster only at first managed opening", () => {
    expect(sql).toContain("if not found and may_manage then");
    expect(sql).toContain("e.status = 'active' and s.status <> 'archived'");
    expect(sql).not.toMatch(/delete from public.class_session_members/i);
  });
  it("locks and updates current learning state with its append-only history", () => {
    expect(sql).toContain("for update");
    expect(sql).toContain("for share");
    expect(sql).toContain("Session revision conflict");
    expect(sql).toContain("Learning item revision conflict");
    expect(sql).toContain("insert into public.student_session_progress");
    expect(sql).toContain("update public.student_learning_items");
    expect(sql).toContain("item.status in ('removed', 'skipped')");
    expect(sql).toContain("sp.deleted_at is null");
    expect(sql).not.toContain("exception when");
  });
  it("protects corrections from overwriting newer learning state", () => {
    expect(sql).toContain("p.supersedes_id = previous.id");
    expect(sql).toContain("item.revision is distinct from previous.learning_item_revision_after");
    expect(sql).toContain("Newer progress exists");
    expect(sql).toContain("clock_timestamp()");
    expect(sql).toContain("student_session_progress_append_only before update or delete");
    expect(sql).toContain("attendance_records_append_only before update or delete");
    expect(sql).toContain("revoke insert, update, delete on public.class_sessions");
  });
});
