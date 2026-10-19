import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const sql = readFileSync(
  resolve(
    import.meta.dirname,
    "../supabase/migrations/202610190001_class_attendance_and_history.sql",
  ),
  "utf8",
);
describe("attendance migration contracts (static, not live JWT/RLS)", () => {
  it("uses independent membership/class/student attendance authorization and server actor", () => {
    expect(sql).toContain("private.current_profile_id()");
    expect(sql).toContain("private.can_access_class");
    expect(sql).toContain("private.can_access_student");
    expect(sql).toContain("'attendance.manage'");
    expect(sql).toContain("'attendance.read'");
    expect(sql).toContain("from public, anon");
    expect(sql).not.toMatch(/grant[^;]+to anon/i);
    expect(sql).toContain(
      "revoke insert, update, delete on public.attendance_records from authenticated",
    );
  });
  it("serializes lesson updates and appends correction history; never changes progress", () => {
    expect(sql).toContain("for update");
    expect(sql).toContain("Session revision conflict");
    expect(sql).toContain("previousRecordId");
    expect(sql).toContain("previous.id, reason");
    expect(sql).toContain("clock_timestamp()");
    expect(sql).toContain("at time zone 'Asia/Taipei'");
    expect(sql).not.toMatch(/(?:delete from|update) public.attendance_records/i);
    expect(sql).not.toMatch(/(?:insert into|update|delete from) public.student_learning_items/i);
  });
  it("enriches original version and item position, separate from record time", () => {
    expect(sql).toContain("'itemPosition', i.position");
    expect(sql).toContain("'versionId', sp.version_id");
    expect(sql).toContain("'arrivedAt', a.arrived_at");
    expect(sql).toContain("'recordedAt', a.recorded_at");
    expect(sql).toContain("attendance_arrival_only_when_late");
  });
});
