-- Read-only readiness check. Run in the intended Supabase project before migration.
select
  to_regclass('public.students') as students,
  to_regclass('public.study_plans') as study_plans,
  to_regclass('public.student_learning_items') as student_learning_items,
  to_regclass('public.curriculum_items') as curriculum_items,
  to_regprocedure('private.can_access_student(text,text,text)') as student_scope_helper;

-- These should be NULL before the first migration. Existing values mean stop and inspect;
-- do not drop existing data or blindly rerun the migration.
select
  to_regclass('public.student_exam_ranges') as existing_ranges,
  to_regclass('public.student_exam_range_items') as existing_range_items,
  to_regprocedure('public.read_student_exam_ranges(text,text)') as existing_read_rpc,
  to_regprocedure('public.save_student_exam_range(text,jsonb)') as existing_save_rpc;

-- After migration both rows should report RLS enabled, no authenticated direct writes.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
  has_table_privilege('authenticated', c.oid, 'INSERT') as direct_insert,
  has_table_privilege('authenticated', c.oid, 'UPDATE') as direct_update,
  has_table_privilege('authenticated', c.oid, 'DELETE') as direct_delete
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('student_exam_ranges', 'student_exam_range_items');
