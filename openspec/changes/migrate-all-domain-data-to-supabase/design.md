## Context

LearnTrack is a Next.js application deployed to Vercel. Supabase already owns authentication, identity/membership resolution, platform authorization, organization and platform audit stores, and Platform Owner inspection of selected student/class data. Most teaching-domain repositories and services still import normalized in-memory Mock stores. See `proposal.md` for motivation and `specs/supabase-domain-persistence/spec.md` for the behavior contract.

The migration must preserve the current multi-tenant permission model, Platform Owner read-only behavior, server/client boundaries, existing routes, and current UI contracts. The current shared Supabase environment must not be used for destructive RLS tests.

## Goals / Non-Goals

**Goals:**

- Provide a normalized database model for every current Mock entity and relationship.
- Put repository interfaces between services and every persistence implementation.
- Select Supabase adapters in Production and keep Mock adapters for tests.
- Make multi-table writes atomic and conflict-safe.
- Enforce the same scope in application code and RLS.
- Roll out in independently testable phases without a flag day.

**Non-Goals:**

- Redesigning screens, routes, business terminology, permissions, or lifecycle behavior.
- Introducing a separate backend service or ORM.
- Copying demonstration Mock fixtures into Production automatically.
- Giving Platform Owner tenant mutation rights.
- Splitting Preview and Production into different Supabase projects within this change; the design keeps that future split possible.

## Decisions

### 1. Use normalized organization-scoped tables

Every tenant table carries `organization_id`, stable primary keys, timestamps, and appropriate unique/foreign-key constraints. Planned groups:

- Class structure: `class_subjects`, `class_grade_scopes`, `class_schedules` alongside existing `course_classes`, `class_enrollments`, and `class_assignments`.
- Student details: `student_profiles`, existing `student_contacts`, `assessments`, and `assessment_results`.
- Daily teaching: `class_sessions`, `class_session_members`, `attendance_records`, and `student_session_progress`.
- Curriculum: reference tables for grades, subjects, publishers, and terms; `curriculum_templates`, `curriculum_template_versions`, `curriculum_template_items`, `study_plans`, and `student_learning_items`.

Dashboard and analytics remain derived repository queries or database views; they are not separate writable sources of truth.

Alternative considered: store aggregates in JSONB. Rejected because relationship-scoped RLS, uniqueness, assignment checks, and reporting require relational joins and stable foreign keys.

### 2. Keep contracts separate from adapters

Feature-safe domain/view-model contracts remain outside `src/server`. Services depend on repository interfaces. Mock implementations live under test/development adapters; Supabase implementations live under server repositories. A composition root selects implementations based on validated runtime configuration.

Alternative considered: change each service to call Supabase directly. Rejected because it couples business rules to storage, makes tests brittle, and prevents staged replacement.

### 3. Use server-side Supabase clients with actor context

User-scoped reads and writes use a server client carrying the current Supabase session so RLS evaluates the actor. Service-role access is limited to bootstrap/admin operations that cannot be expressed as user actions, and application authorization is still checked before the repository call.

Alternative considered: use the service-role key for every repository and rely only on services. Rejected because it bypasses the required database isolation layer.

### 4. Use database functions for aggregate mutations

Class aggregates, curriculum version publication/reordering, student enrollment changes, attendance submission, and class-session completion span multiple tables. PostgreSQL functions perform these writes in one transaction after receiving validated stable identifiers and expected revisions. Functions return stable result data and never infer organization authority solely from browser input.

Alternative considered: sequential Supabase API calls. Rejected because partial failure could leave inconsistent relationships.

### 5. Apply RLS through shared membership helpers

Policies use existing active-membership, permission, class-assignment, student-link, contact-link, and platform-read helpers. Tenant INSERT/UPDATE policies require both organization membership and the relevant permission. Platform policies remain SELECT-only. Append-only tables reject update/delete.

### 6. Migrate feature groups incrementally

Implementation order is dependency-driven:

1. Provider composition and schema foundations.
2. Student/class/enrollment/schedule persistence.
3. Account/role administration persistence.
4. Daily sessions and attendance.
5. Curriculum and study plans.
6. Student profile, contacts, assessments, and progress.
7. Dashboard/analytics queries and removal of production Mock dependencies.

Each phase switches reads and writes together for that feature to avoid a split source of truth.

### 7. Use explicit seed and verification scripts

Reference catalogs may be seeded idempotently. Existing live rows are preserved with `on conflict` rules scoped to stable natural identifiers. Demonstration fixtures remain test-only. Verification scripts report counts and broken foreign keys without printing secrets or personal data.

## Risks / Trade-offs

- **[Large migration surface]** → Deliver in feature phases with repository contract tests and one source of truth per feature.
- **[RLS can block valid workflows]** → Test each actor matrix with real JWTs in an isolated Supabase project before Preview acceptance.
- **[Service-role use could bypass isolation]** → Centralize and audit its use; default repositories use the actor session.
- **[Schema/app version mismatch]** → Deploy additive migrations first, keep adapters backward-compatible during rollout, then deploy application code.
- **[Existing shared environment contains manual data]** → Use non-destructive migrations and preflight reports; never seed demonstration data into live organizations.
- **[Cold starts or sequential queries]** → Add indexes for organization/status/relationship joins and batch/aggregate repository reads.
- **[Mock and Supabase contract drift]** → Run the same repository contract suite against both adapters where practical.

## Migration Plan

1. Create an isolated Supabase test project or branch and capture a sanitized schema/data inventory.
2. Apply additive schema, constraints, helper functions, RLS, grants, and indexes.
3. Run static migration tests and real-JWT RLS integration tests.
4. Implement repository composition and migrate student/class/enrollment/schedule reads and writes.
5. Continue feature groups in the decided order, running contract and browser acceptance after each group.
6. Verify that no Production code path imports Mock stores and that runtime configuration fails closed.
7. Apply migrations to the shared environment, run non-destructive preflight verification, then deploy Preview.
8. Complete persona/organization/restart/email/audit acceptance and deploy Production.

Rollback keeps migrations additive: application adapters can temporarily return to the previous compatible implementation before data-changing cleanup migrations. Destructive column/table removal is deferred to a separate later change after data reconciliation and backup confirmation.
