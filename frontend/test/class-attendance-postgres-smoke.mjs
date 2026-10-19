// Isolated embedded PostgreSQL; no .env files, Supabase connections or live user data.
// node test/class-attendance-postgres-smoke.mjs <absolute PGlite module path>
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
const migration = async (name) =>
  readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");
try {
  await db.exec(`
    create role anon; create role authenticated; create schema private;
    create table public.organizations(id text primary key);
    create table public.profiles(id text primary key, display_name text);
    create table public.students(id text primary key, organization_id text, display_name text, student_number text, status text default 'active', unique(id,organization_id));
    create table public.course_classes(id text primary key, organization_id text, name text, code text, unique(id,organization_id));
    create table public.class_schedules(id uuid primary key default gen_random_uuid(), organization_id text, class_id text, weekday int, starts_at time, ends_at time, room text);
    create table public.class_enrollments(class_id text, student_id text, organization_id text, status text, primary key(class_id,student_id));
    create table public.class_assignments(organization_id text, class_id text, membership_id text, status text);
    create table public.organization_memberships(id text, organization_id text, profile_id text, status text);
    create table public.subjects(organization_id text, code text, name text);
    create function public.set_updated_at() returns trigger language plpgsql as 'begin new.updated_at := now(); return new; end';
    create function private.current_profile_id() returns text language sql stable as 'select nullif(current_setting(''test.profile'',true),'''')';
    create function private.can_access_class(org text, class_id text, permission text) returns boolean language sql stable security definer set search_path = '' as
      'select org = current_setting(''test.org'',true) and class_id = any(string_to_array(current_setting(''test.classes'',true),'','')) and permission = any(string_to_array(current_setting(''test.permissions'',true),'','')) and private.current_profile_id() is not null';
    create function private.can_access_student(org text, student text, permission text) returns boolean language sql stable security definer set search_path = '' as
      'select org = current_setting(''test.org'',true) and student = any(string_to_array(current_setting(''test.students'',true),'','')) and permission = any(string_to_array(current_setting(''test.permissions'',true),'','')) and private.current_profile_id() is not null';
    grant usage on schema private to authenticated;
    insert into public.organizations values ('org-a'),('org-b');
    insert into public.profiles values ('teacher','老師');
    insert into public.students(id,organization_id,display_name,student_number) values ('s1','org-a','學生甲','STU-0001'),('s2','org-a','學生乙','STU-0002'),('s3','org-b','學生丙','STU-0001');
    insert into public.course_classes values ('c1','org-a','班級A','C1'),('c2','org-b','班級B','C2');
    insert into public.class_enrollments values ('c1','s1','org-a','active'),('c1','s2','org-a','active'),('c2','s3','org-b','active');
    select set_config('test.profile','teacher',false),set_config('test.org','org-a',false),set_config('test.classes','c1',false),set_config('test.students','s1,s2',false),set_config('test.permissions','progress.read,progress.manage,attendance.read,attendance.manage',false);
  `);
  await db.exec(await migration("202610030001_class_session_progress.sql"));
  await db.exec(
    (await migration("202610070001_curriculum_study_plan_lifecycle.sql")).split(
      "create table if not exists public.assessment_series",
    )[0] + "commit;",
  );
  await db.exec(await migration("202610100001_class_session_functions.sql"));
  await db.exec(await migration("202610190001_class_attendance_and_history.sql"));
  const read = async (org = "org-a", cls = "c1") =>
    (
      await db.query("select public.open_class_daily_workspace_v2($1,$2,'2026-10-19') as result", [
        org,
        cls,
      ])
    ).rows[0].result;
  const save = async (command, org = "org-a") =>
    db.query("select public.save_class_daily_attendance($1,$2::jsonb)", [
      org,
      JSON.stringify(command),
    ]);
  const denied = async (callback, code) => assert.rejects(callback, (error) => error.code === code);
  const count = async () =>
    (await db.query("select count(*)::int as n from public.attendance_records")).rows[0].n;
  let workspace = await read();
  assert.equal(workspace.members.length, 2);
  assert.equal(workspace.attendanceAvailable, true);
  const member = workspace.members[0];
  const command = {
    sessionId: workspace.session.id,
    sessionRevision: 1,
    reason: "",
    entries: [
      {
        sessionMemberId: member.id,
        studentId: member.studentId,
        status: "late",
        arrivalTime: "18:42",
      },
    ],
  };
  await db.exec("set role authenticated");
  await save(command);
  workspace = await read();
  assert.equal(workspace.session.revision, 2);
  assert.equal(workspace.members[0].attendanceStatus, "late");
  assert.equal(
    new Date(workspace.members[0].attendance.arrivedAt).toISOString(),
    "2026-10-19T10:42:00.000Z",
  );
  const original = workspace.members[0].attendance;
  await denied(() => save(command), "40001");
  await denied(() => save({ ...command, sessionRevision: 2 }), "40001");
  const correction = {
    ...command,
    sessionRevision: 2,
    entries: [{ ...command.entries[0], previousRecordId: original.id, arrivalTime: "18:50" }],
  };
  await denied(() => save(correction), "23514");
  await save({ ...correction, reason: "更正時間" });
  workspace = await read();
  assert.equal(workspace.members[0].attendance.revision, 2);
  assert.equal(
    (await db.query("select supersedes_id from public.attendance_records where revision=2")).rows[0]
      .supersedes_id,
    original.id,
  );
  assert.equal(await count(), 2);
  const current = workspace.members[0].attendance;
  const next = {
    ...command,
    sessionRevision: 3,
    reason: "再次更正",
    entries: [{ ...command.entries[0], previousRecordId: current.id }],
  };
  await denied(
    () =>
      save({
        ...next,
        entries: [
          ...next.entries,
          { ...next.entries[0], sessionMemberId: workspace.members[1].id, studentId: "s1" },
        ],
      }),
    "23514",
  );
  assert.equal(await count(), 2);
  assert.equal((await read()).session.revision, 3);
  for (const arrivalTime of ["24:00", "18:60", "yesterday"])
    await denied(() => save({ ...next, entries: [{ ...next.entries[0], arrivalTime }] }), "23514");
  await denied(
    () => save({ ...next, entries: [{ ...next.entries[0], status: "present" }] }),
    "23514",
  );
  await denied(() => db.exec("insert into public.attendance_records default values"), "42501");
  await denied(() => db.exec("update public.attendance_records set note='changed'"), "42501");
  await db.exec("select set_config('test.permissions','progress.read,progress.manage',false)");
  await denied(() => save(next), "42501");
  assert.equal((await read()).canManageAttendance, false);
  assert.equal((await read()).members[0].attendance, null);
  await db.exec(
    "select set_config('test.permissions','progress.read,progress.manage,attendance.read,attendance.manage',false)",
  );
  await denied(() => read("org-b", "c2"), "42501");
  await db.exec(
    "select set_config('test.org','org-b',false),set_config('test.classes','c2',false),set_config('test.students','s3',false)",
  );
  await denied(() => save(next, "org-a"), "42501");
  await denied(() => read("org-a", "c1"), "42501");
  await db.exec(
    "select set_config('test.org','org-a',false),set_config('test.classes','other-class',false)",
  );
  await denied(() => save(next), "42501");
  await db.exec(
    "select set_config('test.classes','c1',false),set_config('test.students','s2',false)",
  );
  await denied(() => save(next), "42501");
  await db.exec(
    "select set_config('test.students','s1,s2',false),set_config('test.profile','platform',false),set_config('test.permissions','',false)",
  );
  await denied(() => save(next), "42501");
  await db.exec("reset role; set role anon");
  await denied(() => save(next), "42501");
  await denied(() => read(), "42501");
  await db.exec(`reset role;
    select set_config('test.profile','teacher',false),set_config('test.permissions','progress.read,progress.manage,attendance.read,attendance.manage',false);
    update public.class_sessions set status='completed' where id='${command.sessionId}';
  `);
  const append = {
    ...command,
    sessionRevision: 3,
    entries: [
      {
        sessionMemberId: workspace.members[1].id,
        studentId: workspace.members[1].studentId,
        status: "present",
      },
    ],
  };
  await denied(() => save(append), "23514");
  await save({ ...append, reason: "課後補登" });
  assert.equal(await count(), 3);
  // Actual trigger rejects overwrites even for table owner, not only REST grant checks.
  await denied(() => db.exec("update public.attendance_records set note='changed'"), "42501");
  // Original plan metadata survives historical/replaced plans and is not inferred from names.
  await db.exec(`
    insert into public.curriculum_templates(id,organization_id,name,grade_id,subject_id,publisher_id) values ('tpl','org-a','同名教材','g7','math','custom');
    insert into public.curriculum_versions(id,organization_id,template_id,version_number) values ('v1','org-a','tpl',1);
    insert into public.study_plans(id,organization_id,student_id,term_id,grade_id,subject_id,version_id) values ('p1','org-a','s1','115-1','g7','math','v1');
    insert into public.student_learning_items(id,organization_id,study_plan_id,lineage_id,item_type,title,position) values ('i1','org-a','p1','l1','chapter','第一項',1),('i2','org-a','p1','l2','chapter','第二項',2);
    insert into public.student_session_progress(organization_id,class_session_id,session_member_id,student_id,study_plan_id,learning_item_id,status_after_session,recorded_at) values
      ('org-a','${command.sessionId}','${member.id}','s1','p1','i1','completed','2026-10-19T12:00:00Z'),
      ('org-a','${command.sessionId}','${member.id}','s1','p1','i2','completed','2026-10-19T10:00:00Z');
    update public.study_plans set status='replaced',replaced_at=now() where id='p1';
  `);
  workspace = await read();
  assert.equal(workspace.history.length, 2);
  assert.deepEqual(workspace.history.map((entry) => entry.itemPosition).sort(), [1, 2]);
  assert.equal(workspace.history[0].studyPlanId, "p1");
  assert.equal(workspace.history[0].versionLabel, "版本 1");
  assert.equal(workspace.members[0].plans.length, 0);
  assert.equal(workspace.members[0].history.length, 2);
  console.log(
    "PASS: isolated PostgreSQL attendance atomicity, scope denials, arrival, corrections, grants, append-only triggers and historical metadata. Fixture permission helpers are NOT live Supabase JWT/RLS acceptance.",
  );
} finally {
  await db.close();
}
