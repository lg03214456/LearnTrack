## 1. Persistence foundation

- [x] 1.1 Inventory every production import of `src/server/data/mock`, map each entity to its target table/adapter, and verify the inventory covers all current Mock stores.
- [x] 1.2 Define provider composition for domain repositories, reject Mock providers in Production, and verify provider-config tests cover allowed and fail-closed combinations.
- [x] 1.3 Add a shared user-session Supabase server client and repository error mapping without exposing secrets, and verify focused client/config tests pass.
- [ ] 1.4 Extend static migration tests to require all new tables, keys, indexes, RLS enablement, grants, policies, revision fields, and append-only protections.

## 2. Student and class schema

- [x] 2.1 Add an additive migration for class subjects, grade scopes, schedules, student profile extensions, required constraints, indexes, and updated timestamps; verify migration static tests pass.
- [x] 2.2 Add database functions for atomic class aggregate create/update/lifecycle changes with expected revision checks; verify SQL contract tests cover success, conflict, invalid relationship, and rollback shapes.
- [x] 2.3 Add database functions or transactional repository operations for student create/update/archive/restore and enrollment replacement; verify duplicate number, capacity, organization, and lifecycle cases.
- [ ] 2.4 Add RLS policies for student/class/enrollment/schedule relationships and verify real-JWT Organization A, Organization B, teacher, student/contact, Platform Owner, and anonymous cases in an isolated database.

## 3. Student and class repositories

- [x] 3.1 Implement Supabase student roster read and mutation adapters behind the existing contracts and verify the repository contract suite against Mock and Supabase adapters.
- [x] 3.2 Implement Supabase student detail and contact adapters and verify organization, relationship, not-found, revision, and contact-write cases.
- [x] 3.3 Implement Supabase class management, enrollment, assignment, subject, grade, and schedule adapters and verify aggregate mapping and transactional mutations.
- [ ] 3.4 Switch student/class composition to Supabase in configured environments and verify existing component, action, service, repository, and route tests remain green.
- [ ] 3.5 Perform browser acceptance for student/class create, edit, archive, enrollment, teacher assignment, reload, and second-device persistence in Preview.

## 4. Account and role administration

- [ ] 4.1 Replace `accessStore` account/role reads with Supabase-backed repositories while preserving identity/membership/role contracts; verify account and role repository tests.
- [ ] 4.2 Implement atomic Owner-managed account creation linking `auth.users`, profiles, membership, and roles with compensation on failure; verify duplicate, partial-failure, inactive, and unauthorized cases.
- [ ] 4.3 Implement role permission and membership role mutations with revision/conflict protection and self-promotion safeguards; verify RLS and service denial tests.
- [ ] 4.4 Verify Organization Owner account/role workflows persist after restart and Platform Owner remains unable to mutate tenant accounts.

## 5. Daily sessions and attendance

- [x] 5.1 Add migrations for `class_sessions`, `class_session_members`, `attendance_records`, and `student_session_progress` with uniqueness, revision, correction lineage, and indexes; verify static migration tests.
- [ ] 5.2 Add tenant/relationship RLS and atomic functions for opening sessions, saving attendance, recording progress, completing sessions, and corrections; verify real-JWT integration cases.
- [ ] 5.3 Implement Supabase class-session and attendance repositories behind current contracts; verify repository/service/action tests and transaction rollback behavior.
- [ ] 5.4 Verify daily workspace and attendance data survive reload/redeployment and remain limited to assigned classes and linked students.

## 6. Curriculum and study plans

- [ ] 6.1 Add reference and curriculum migrations for grades, subjects, publishers, terms, templates, versions, items, plans, and learning items; verify keys, positions, revisions, and indexes.
- [ ] 6.2 Add RLS and atomic functions for template creation, version publication, item reorder, plan replacement, and learning-item updates; verify tenant and lifecycle restrictions with real JWTs.
- [ ] 6.3 Implement Supabase curriculum and study-plan repositories, remove production imports of `curriculumStore`, and verify Mock/Supabase contract tests.
- [ ] 6.4 Verify curriculum, plan, custom item, reorder, publication, and progress workflows persist after restart without changing current UI behavior.

## 7. Assessments and student history

- [x] 7.1 Add migrations for assessments and assessment results and finalize student profile/contact storage mapping; verify foreign keys, revisions, score validation, and organization indexes.
- [ ] 7.2 Add RLS policies for teacher/class/student/contact visibility and mutation permissions; verify the persona matrix in an isolated database.
- [ ] 7.3 Implement Supabase assessment, result, profile, guardian/contact, and history adapters and verify create/update/read/report tests.
- [ ] 7.4 Verify student detail, assessment history, session history, report export, and contact edits read the same durable source after reload.

## 8. Dashboard and analytics

- [ ] 8.1 Replace fixture-derived dashboard/progress/analytics data with organization-scoped aggregate queries or views and verify counts match authoritative domain rows.
- [ ] 8.2 Remove hard-coded display metrics or mark non-live demonstration values explicitly, and verify component tests use repository-provided view models.
- [ ] 8.3 Add performance indexes and inspect query plans for primary list/dashboard queries using representative data; record and verify acceptable query behavior.

## 9. Remove production Mock dependencies

- [ ] 9.1 Add an automated boundary test that fails when production server/app code imports `src/server/data/mock`, allowing only tests and explicit development adapters.
- [ ] 9.2 Switch every configured production repository to Supabase and verify a source scan reports no Production Mock persistence path.
- [ ] 9.3 Keep minimal deterministic Mock adapters for unit/component tests and verify the full existing test suite remains isolated from live Supabase.
- [ ] 9.4 Update code maps, system architecture, UI/action flow, Supabase handoff, environment-variable, migration, backup, and rollback documentation and verify all referenced paths exist.

## 10. End-to-end verification and rollout

- [x] 10.1 Run format, lint, typecheck, full unit/component tests, static migration tests, and Production build with zero errors or warnings.
- [ ] 10.2 Apply migrations to an isolated Supabase environment and run the Organization A/B, teacher, student/contact, Platform Owner, and anonymous RLS matrix with real actor JWTs.
- [ ] 10.3 Run Preview browser acceptance for authentication, password reset, accounts, roles, students, classes, attendance, sessions, curriculum, plans, assessments, reports, dashboards, tenant switching, audit, reload, and second-device persistence.
- [ ] 10.4 Run a non-destructive preflight against the deployment Supabase project, back up material data, apply schema before application code, and verify counts and foreign-key health.
- [ ] 10.5 Deploy Production, perform read-only smoke checks plus authorized test-record create/read/update cleanup, verify audit events, and document any deferred Production mutation tests.
