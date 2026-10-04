## Purpose

Provide durable, tenant-isolated PostgreSQL persistence for every LearnTrack production workflow while preserving current user-visible behavior and keeping Mock data limited to tests.

## ADDED Requirements

### Requirement: Production domain data is durable
The system SHALL store every successful production mutation for students, contacts, classes, enrollment, teacher assignment, schedules, attendance, class sessions, curriculum, study plans, learning progress, assessments, accounts, roles, and audit history in Supabase PostgreSQL rather than process-local memory.

#### Scenario: Data survives restart and redeployment
- **WHEN** an authorized user creates or updates domain data and the operation succeeds
- **THEN** the same data is returned after application restart, Vercel redeployment, and access from another authorized device

#### Scenario: Failed write is not reported as success
- **WHEN** PostgreSQL rejects or cannot complete a mutation
- **THEN** the system returns a stable failure result and does not display the mutation as durably saved

### Requirement: Production execution does not use Mock persistence
The system MUST select Supabase-backed repositories for production domain reads and writes. Mock repositories SHALL remain available only in tests or an explicitly enabled non-production development mode.

#### Scenario: Production provider validation
- **WHEN** a Production deployment starts without all required Supabase persistence configuration
- **THEN** the system fails closed with a diagnosable configuration error instead of falling back to Mock data

### Requirement: Organization data is tenant-isolated
Every organization-owned row SHALL include a stable organization identifier, and application authorization plus PostgreSQL RLS MUST prevent one organization from reading or mutating another organization's data.

#### Scenario: Organization owner accesses another tenant
- **WHEN** an Organization A actor requests or submits an Organization B identifier
- **THEN** the request is denied without revealing whether the Organization B record exists

#### Scenario: Platform Owner inspects tenant data
- **WHEN** an active Platform Owner explicitly selects an organization
- **THEN** permitted tenant data is readable and tenant mutations remain denied

### Requirement: Relationship-scoped actors receive limited records
Student, parent/contact, teacher, and assigned-class actors SHALL only receive records connected through active database relationships authorized for that actor.

#### Scenario: Parent reads linked student
- **WHEN** a parent/contact actor requests a linked active student
- **THEN** only that student's permitted information is returned

#### Scenario: Teacher accesses an unassigned class
- **WHEN** a teacher requests a class without an active assignment
- **THEN** the system denies access even if the teacher belongs to the same organization

### Requirement: Aggregate writes are atomic
Mutations that update a domain aggregate across multiple tables MUST complete atomically and enforce optimistic revision or equivalent conflict protection where concurrent edits are possible.

#### Scenario: Class update fails midway
- **WHEN** a class update cannot save one of its subjects, grades, teacher assignments, schedules, or enrollments
- **THEN** none of the aggregate changes are committed

#### Scenario: Stale revision is submitted
- **WHEN** a user submits an older revision than the current stored revision
- **THEN** the system returns a conflict and preserves the newer stored data

### Requirement: Existing application behavior remains compatible
The existing routes, form workflows, permission codes, typed UI results, lifecycle states, organization branding, Platform Owner read-only model, and user-facing validation semantics SHALL remain compatible during the persistence migration.

#### Scenario: Repository implementation is replaced
- **WHEN** a feature changes from Mock-backed to Supabase-backed persistence
- **THEN** its page and feature components continue using the same domain or view-model contract unless a separately documented migration is required

### Requirement: Audit remains append-only and correctly separated
Organization actions SHALL write to `audit_logs`; Platform actions SHALL write to `platform_audit_logs`; both stores MUST remain append-only and exclude secrets and personal payloads not present in the approved metadata catalog.

#### Scenario: Organization mutation succeeds
- **WHEN** an organization actor completes a protected mutation
- **THEN** the corresponding organization audit event is durably appended with its true organization identifier

#### Scenario: Required audit write fails
- **WHEN** a security-required audit event cannot be persisted
- **THEN** the protected operation fails closed rather than silently succeeding

### Requirement: Schema deployment is backward-safe
Database migrations SHALL be ordered, idempotent where reruns are expected, and deployable before application code begins using new tables. Existing identities, organizations, memberships, roles, students, classes, and audits MUST not be duplicated or destructively overwritten.

#### Scenario: Migration runs against an initialized environment
- **WHEN** the migration is applied to a Supabase project containing existing LearnTrack identity and platform tables
- **THEN** existing records remain intact and the new schema is available for the application rollout

### Requirement: Persistence is verifiable before Production rollout
The change MUST provide static migration checks, repository contract tests, real-database integration tests with actor JWTs, and Preview acceptance for create, read, update, isolation, conflict, audit, and restart persistence.

#### Scenario: Cross-tenant integration test
- **WHEN** Organization A, Organization B, Platform Owner, and anonymous test actors execute the acceptance matrix
- **THEN** allowed reads and writes succeed, forbidden paths fail, and no cross-tenant records are returned

