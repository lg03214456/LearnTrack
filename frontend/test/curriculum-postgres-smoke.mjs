// Isolated embedded PostgreSQL smoke test. Never connects to Supabase.
// node test/curriculum-postgres-smoke.mjs <absolute path to @electric-sql/pglite/dist/index.js>
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema private;
    create table public.organizations(id text primary key);
    create table public.profiles(id text primary key);
    create table public.students(id text primary key, organization_id text, display_name text, student_number text, unique(id, organization_id));
    create table public.class_enrollments(organization_id text, student_id text, class_id text, status text);
    create table public.subjects(organization_id text, code text, name text, status text, position integer);
    create function private.has_permission(org text, permission text) returns boolean language sql stable as
      'select org = current_setting(''test.organization'', true) and permission = any(string_to_array(current_setting(''test.permissions'', true), '',''))';
    create function private.can_access_student(org text, student text, permission text) returns boolean language sql stable as
      'select private.has_permission(org, permission) and exists(select 1 from public.students s where s.id = student and s.organization_id = org)';
    insert into public.organizations values ('org-a'), ('org-b');
    insert into public.students values ('student-a', 'org-a', 'Test A', 'STU-0001'), ('student-b', 'org-b', 'Test B', 'STU-0001');
    insert into public.subjects values ('org-a', 'math', '數學', 'active', 1);
    select set_config('test.organization', 'org-a', false), set_config('test.permissions', 'curriculum.read,curriculum.manage,study_plans.read,study_plans.manage', false);
  `);
  const schema = await readFile(
    new URL(
      "../supabase/migrations/202610070001_curriculum_study_plan_lifecycle.sql",
      import.meta.url,
    ),
    "utf8",
  );
  // Load only the curriculum aggregate DDL; unrelated assessment schemas are not mocked.
  await db.exec(schema.split("create table if not exists public.assessment_series")[0] + "commit;");
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/202610100002_curriculum_functions.sql", import.meta.url),
      "utf8",
    ),
  );
  const mutate = async (operation, command, organization = "org-a") =>
    (
      await db.query("select public.mutate_curriculum_workspace($1, $2, $3::jsonb) as result", [
        organization,
        operation,
        JSON.stringify(command),
      ])
    ).rows[0].result.id;
  const read = async (student = null, version = null) =>
    (
      await db.query("select public.read_curriculum_workspace('org-a', $1, $2) as result", [
        version,
        student,
      ])
    ).rows[0].result;
  const denied = async (run, code) => {
    await assert.rejects(run, (error) => error.code === code);
  };
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610110001_curriculum_template_editing.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const editor = async (templateId, organization = "org-a") =>
    (
      await db.query("select public.read_curriculum_template_editor($1, $2) as result", [
        organization,
        templateId,
      ])
    ).rows[0].result;
  const saveTemplate = async (command, organization = "org-a") =>
    db.query("select public.update_curriculum_template($1, $2::jsonb)", [
      organization,
      JSON.stringify(command),
    ]);
  assert.equal((await read()).templates.length, 0);
  const version = await mutate("create", {
    name: "Test curriculum",
    gradeId: "g7",
    subjectId: "math",
    publisherId: "custom",
  });
  await denied(
    () =>
      mutate("create", {
        name: "Test curriculum",
        gradeId: "g7",
        subjectId: "math",
        publisherId: "custom",
      }),
    "23505",
  );
  const unit = await mutate("addItem", {
    versionId: version,
    revision: 1,
    type: "unit",
    title: "Unit",
  });
  const templateId = (await read()).templates[0].id;
  const editable = await editor(templateId);
  assert.equal(editable.canEditClassification, true);
  await saveTemplate({ ...editable, name: "Renamed curriculum", gradeId: "g8" });
  await denied(() => saveTemplate(editable), "40001");
  assert.equal((await editor(templateId)).revision, 2);
  const chapter = await mutate("addItem", {
    versionId: version,
    revision: 2,
    parentId: unit,
    type: "chapter",
    title: "Chapter",
  });
  await denied(
    () => mutate("addItem", { versionId: version, revision: 2, type: "unit", title: "Stale" }),
    "40001",
  );
  await denied(
    () => mutate("reorder", { versionId: version, revision: 3, orderedItemIds: [unit, unit] }),
    "23514",
  );
  await mutate("reorder", { versionId: version, revision: 3, orderedItemIds: [chapter, unit] });
  assert.deepEqual(
    (await read(null, version)).items.map((item) => item.id),
    [chapter, unit],
  );
  await mutate("publish", { versionId: version, revision: 4 });
  const locked = await editor(templateId);
  assert.equal(locked.canEditClassification, false);
  await denied(() => saveTemplate({ ...locked, gradeId: "g7" }), "40001");
  await saveTemplate({ ...locked, name: "Published renamed", publisherId: "hanlin" });
  await denied(() => editor(templateId, "org-b"), "42501");
  await denied(() => saveTemplate(locked, "org-b"), "42501");
  await denied(
    () => mutate("deleteItem", { versionId: version, revision: 5, itemId: unit }),
    "40001",
  );
  const plan = await mutate("replacePlan", {
    studentId: "student-a",
    termId: "115-1",
    versionId: version,
  });
  let page = await read("student-a");
  assert.equal(page.learningItems.length, 2);
  const completed = page.learningItems.find((item) => item.sourceItemId === chapter);
  await mutate("adjustItem", { itemId: completed.id, revision: 1, status: "completed" });
  await denied(
    () => mutate("adjustItem", { itemId: completed.id, revision: 1, status: "pending" }),
    "40001",
  );
  await denied(
    () => mutate("replacePlan", { studentId: "student-a", termId: "115-1", versionId: version }),
    "23505",
  );
  const nextVersion = await mutate("copy", { versionId: version, revision: 5 });
  const nextItems = (await read(null, nextVersion)).items;
  assert.equal(
    nextItems.find((item) => item.lineageId === chapter).parentId,
    nextItems.find((item) => item.lineageId === unit).id,
  );
  await mutate("addItem", {
    versionId: nextVersion,
    revision: 1,
    type: "worksheet",
    title: "New worksheet",
  });
  await mutate("publish", { versionId: nextVersion, revision: 2 });
  const nextPlan = await mutate("replacePlan", {
    studentId: "student-a",
    termId: "115-1",
    versionId: nextVersion,
  });
  page = await read("student-a");
  assert.equal(page.plans.find((row) => row.id === plan).status, "replaced");
  assert.equal(page.plans.filter((row) => row.status === "active").length, 1);
  assert.equal(
    page.learningItems.find((item) => item.planId === nextPlan && item.lineageId === chapter)
      .status,
    "completed",
  );
  assert.equal(
    page.learningItems.find((item) => item.planId === plan && item.lineageId === unit).status,
    "removed",
  );
  assert.equal(page.learningItems.find((item) => item.id === completed.id).status, "completed");
  await denied(
    () => mutate("adjustItem", { itemId: completed.id, revision: 2, status: "pending" }),
    "40001",
  );
  await denied(() => mutate("create", {}, "org-b"), "42501");
  await denied(
    () =>
      mutate("replacePlan", { studentId: "student-b", termId: "115-1", versionId: nextVersion }),
    "42501",
  );
  await db.exec("set role anon");
  await denied(() => editor(templateId), "42501");
  await denied(() => saveTemplate(locked), "42501");
  await denied(() => read(), "42501");
  await db.exec("reset role; set role authenticated");
  assert.equal((await read()).templates.length, 1);
  await denied(() => db.exec("update public.curriculum_versions set status = 'draft'"), "42501");
  await denied(() => db.exec("update public.curriculum_templates set name = 'bypass'"), "42501");
  await db.exec("reset role");
  const deletionDraft = await mutate("copy", { versionId: nextVersion, revision: 3 });
  const deletionItems = (await read(null, deletionDraft)).items;
  const deletionUnit = deletionItems.find((item) => item.type === "unit");
  await mutate("updateItem", {
    versionId: deletionDraft,
    revision: 1,
    itemId: deletionUnit.id,
    title: "Edited unit",
    type: "unit",
  });
  assert.equal(
    (await read(null, deletionDraft)).items.find((item) => item.id === deletionUnit.id).title,
    "Edited unit",
  );
  await mutate("moveItem", {
    versionId: deletionDraft,
    revision: 2,
    itemId: deletionUnit.id,
    direction: "up",
  });
  await denied(
    () =>
      mutate("updateItem", {
        versionId: deletionDraft,
        revision: 3,
        itemId: deletionUnit.id,
        parentId: "another-version-item",
        title: "Invalid",
        type: "unit",
      }),
    "23514",
  );
  await mutate("deleteItem", { versionId: deletionDraft, revision: 3, itemId: deletionUnit.id });
  assert.equal((await read(null, deletionDraft)).items.length, 1);
  const snapshotBefore = (await read("student-a")).learningItems;
  await saveTemplate({ ...(await editor(templateId)), name: "Final name" });
  assert.deepEqual((await read("student-a")).learningItems, snapshotBefore);
  const duplicateVersion = await mutate("create", {
    name: "Duplicate target",
    gradeId: "g7",
    subjectId: "math",
    publisherId: "custom",
  });
  const currentEditor = await editor(templateId);
  await denied(() => saveTemplate({ ...currentEditor, name: "Duplicate target" }), "23505");
  assert.equal((await editor(templateId)).name, "Final name");
  const beforeArchive = await read("student-a");
  await mutate("archive", { templateId });
  const afterArchive = await read("student-a");
  assert.deepEqual(afterArchive.plans, beforeArchive.plans);
  assert.deepEqual(afterArchive.learningItems, beforeArchive.learningItems);
  assert.deepEqual(afterArchive.items, beforeArchive.items);
  assert.deepEqual(afterArchive.versions, beforeArchive.versions);
  await denied(() => mutate("replacePlan", { studentId: "student-a", termId: "115-2", versionId: nextVersion }), "P0002");
  await denied(() => saveTemplate({ ...locked, revision: 5 }), "40001");
  await denied(() => editor(templateId), "P0002");
  assert.ok(duplicateVersion);
  console.log(
    "PASS: isolated PostgreSQL create, duplicate, reorder, publish, copy, replace, completion carry-over, soft removal, conflict, tenant denial, anon denial, direct-write denial, draft deletion.",
  );
  console.log("Not a live Supabase JWT/RLS test: membership helpers use isolated test fixtures.");
} finally {
  await db.close();
}
