// Isolated embedded PostgreSQL only; never connects to Supabase or loads environment files.
// node test/exam-ranges-postgres-smoke.mjs <absolute PGlite module path>
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated; create schema private;
    create table public.organizations(id text primary key);
    create table public.profiles(id text primary key);
    create table public.students(id text primary key, organization_id text, unique(id, organization_id));
    create function private.can_access_student(org text, student text, permission text) returns boolean language sql stable security definer set search_path = '' as
      'select org = current_setting(''test.organization'',true)
       and permission = any(string_to_array(current_setting(''test.permissions'',true),'',''))
       and student = any(string_to_array(current_setting(''test.students'',true),'',''))
       and exists(select 1 from public.students s where s.id = student and s.organization_id = org)';
    grant usage on schema private to authenticated;
    insert into public.organizations values ('org-a'), ('org-b');
    insert into public.students values ('student-a','org-a'), ('student-a2','org-a'), ('student-b','org-b');
  `);
  const schema = await readFile(
    new URL(
      "../supabase/migrations/202610070001_curriculum_study_plan_lifecycle.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(schema.split("create table if not exists public.assessment_series")[0] + "commit;");
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/202610160001_student_exam_ranges.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(`
    insert into public.curriculum_templates(id,organization_id,name,grade_id,subject_id,publisher_id) values
      ('tpl-a','org-a','教材','g7','math','custom'), ('tpl-b','org-b','教材B','g7','math','custom');
    insert into public.curriculum_versions(id,organization_id,template_id,version_number,status) values
      ('version-a','org-a','tpl-a',1,'published'), ('version-b','org-b','tpl-b',1,'published');
    insert into public.curriculum_items(id,organization_id,version_id,lineage_id,item_type,title,position,parent_id) values
      ('source-unit','org-a','version-a','u','unit','單元',0,null),
      ('source-a','org-a','version-a','a','chapter','章節A',1,'source-unit'),
      ('source-b','org-a','version-a','b','worksheet','講義B',2,'source-unit');
    insert into public.study_plans(id,organization_id,student_id,term_id,grade_id,subject_id,version_id) values
      ('plan-a','org-a','student-a','115-1','g7','math','version-a'),
      ('plan-a2','org-a','student-a2','115-1','g7','math','version-a'),
      ('plan-b','org-b','student-b','115-1','g7','math','version-b');
    insert into public.student_learning_items(id,organization_id,study_plan_id,lineage_id,item_type,title,position,status,completed_at,source_item_id) values
      ('unit','org-a','plan-a','u','unit','單元',0,'pending',null,'source-unit'),
      ('a','org-a','plan-a','a','chapter','章節A',1,'completed',now(),'source-a'),
      ('b','org-a','plan-a','b','worksheet','講義B',2,'skipped',null,'source-b'),
      ('custom','org-a','plan-a','custom','material','自訂',3,'pending',null,null),
      ('a2','org-a','plan-a2','a2','chapter','其他學生',0,'pending',null,null),
      ('foreign','org-b','plan-b','foreign','chapter','其他機構',0,'pending',null,null);
    select set_config('test.organization','org-a',false), set_config('test.permissions','study_plans.read,study_plans.manage',false),set_config('test.students','student-a,student-a2',false);
  `);
  const read = async (studentId = "student-a", org = "org-a") =>
    (await db.query("select public.read_student_exam_ranges($1,$2) as result", [org, studentId]))
      .rows[0].result;
  const save = async (command, org = "org-a") =>
    (
      await db.query("select public.save_student_exam_range($1,$2::jsonb) as result", [
        org,
        JSON.stringify(command),
      ])
    ).rows[0].result;
  const denied = async (run, code) => assert.rejects(run, (error) => error.code === code);
  const command = {
    studentId: "student-a",
    rangeId: null,
    revision: 0,
    name: "第一次段考",
    examDate: "2026-11-01",
    itemIds: ["a", "b", "a"],
  };
  const progressBefore = (await db.query("select * from public.student_learning_items order by id"))
    .rows;
  assert.equal((await read()).ranges.length, 0);
  const options = (await read()).items;
  assert.equal(options.find((row) => row.id === "a").parentId, "unit");
  assert.equal(
    options.some((row) => row.id === "a2" || row.id === "foreign"),
    false,
  );
  await db.exec("set role authenticated");
  const created = await save(command);
  const createdRange = (await read()).ranges[0];
  assert.equal(createdRange.id, created.id);
  assert.equal(createdRange.revision, 1);
  assert.deepEqual(createdRange.itemIds, ["a", "b"]);
  assert.equal((await read("student-a2")).ranges.length, 0);
  const edit = {
    ...command,
    rangeId: created.id,
    revision: 1,
    name: "調整段考",
    examDate: null,
    itemIds: ["custom"],
  };
  await save(edit);
  assert.equal((await read()).ranges[0].revision, 2);
  await denied(() => save(edit), "40001");
  for (const itemIds of [[], ["a2"], ["foreign"], ["unit"], ["missing"], ["a", "a2"]])
    await denied(() => save({ ...command, itemIds }), "23514");
  await denied(() => save({ ...edit, rangeId: "unknown" }), "P0002");
  await denied(() => save({ ...command, examDate: "2026-02-30" }), "22008");
  assert.deepEqual((await read()).ranges[0].itemIds, ["custom"]);
  await denied(() => db.exec("update public.student_exam_ranges set name='bypass'"), "42501");
  await denied(() => db.exec("delete from public.student_exam_range_items"), "42501");
  // Owner, teacher/student/parent scopes are simulated helper inputs, not real JWT verification.
  await db.exec("select set_config('test.students','student-a2',false)");
  await denied(() => read(), "42501");
  await denied(() => save(command), "42501");
  await db.exec(
    "select set_config('test.students','student-a',false),set_config('test.permissions','study_plans.read',false)",
  );
  assert.equal((await read()).ranges.length, 1);
  await denied(() => save(command), "42501");
  await db.exec("select set_config('test.permissions','',false)");
  await denied(() => read(), "42501");
  await denied(() => save(command), "42501");
  await db.exec(
    "select set_config('test.permissions','study_plans.read,study_plans.manage',false)",
  );
  await denied(() => read("student-b", "org-b"), "42501");
  await denied(
    () => save({ ...command, studentId: "student-b", itemIds: ["foreign"] }, "org-b"),
    "42501",
  );
  const visible = (await db.query("select student_id from public.student_exam_ranges")).rows;
  assert.deepEqual(visible, [{ student_id: "student-a" }]);
  await db.exec("set role anon");
  await denied(() => read(), "42501");
  await denied(() => save(command), "42501");
  await db.exec("reset role");
  assert.deepEqual(
    (await db.query("select * from public.student_learning_items order by id")).rows,
    progressBefore,
  );
  // Composite foreign keys also reject a privileged accidental mismatch.
  await denied(
    () =>
      db.exec(
        `insert into public.student_exam_range_items values ('org-a','student-a','${created.id}','plan-a2','a2')`,
      ),
    "23503",
  );
  await db.exec(
    "update public.study_plans set status='replaced',replaced_at=now() where id='plan-a'",
  );
  await db.exec(
    "update public.student_learning_items set status='removed',removed_at=now(),removed_reason='plan replaced' where id='custom'",
  );
  assert.deepEqual((await read()).ranges[0].itemIds, ["custom"]);
  assert.equal((await read()).items.find((row) => row.id === "custom").planStatus, "replaced");
  await save({ ...edit, revision: 2 }); // retained historical selection remains editable
  await denied(() => save({ ...command, itemIds: ["a"] }), "23514");
  assert.equal((await read()).ranges.length, 1);
  await db.exec(
    "select set_config('test.organization','org-b',false),set_config('test.students','student-b',false)",
  );
  const b = await save({ ...command, studentId: "student-b", itemIds: ["foreign"] }, "org-b");
  assert.ok(b.id);
  assert.equal((await read("student-b", "org-b")).ranges.length, 1);
  await denied(() => read(), "42501");
  console.log(
    "PASS: isolated PostgreSQL create/edit/reload, custom content, dedup, revisions, atomic rejection, relationship FKs, role grants/RLS, tenant/student scope, historical retention, no progress mutation.",
  );
  console.log(
    "Not live Supabase JWT verification; permission helpers are isolated fixtures. Concurrent sessions/plan-replacement race remain separate acceptance checks.",
  );
} finally {
  await db.close();
}
