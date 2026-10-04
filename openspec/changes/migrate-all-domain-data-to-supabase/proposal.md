## Why

LearnTrack currently authenticates and audits through Supabase, but most teaching, student, class, curriculum, attendance, and account-management data still lives in process-local Mock stores. Users need every production workflow to persist in organization-scoped PostgreSQL tables so data survives restarts and deployments and remains isolated by RLS.

## What Changes

- Add normalized Supabase tables, constraints, indexes, timestamps, revision fields, and RLS policies for every remaining domain currently represented only by Mock stores.
- Replace production Mock repositories with Supabase repository adapters for student, class, enrollment, scheduling, attendance, daily sessions, curriculum, study plans, assessments, progress, contacts, account administration, and dashboard queries.
- Preserve current routes, forms, messages, permissions, organization scoping, Platform Owner read-only behavior, and existing domain contracts unless a persistence-safe contract change is required.
- Keep Mock adapters only for isolated unit/component tests and explicit non-production development fixtures.
- Add transactional database functions where a multi-table aggregate must be written atomically.
- Provide seed/migration verification, RLS integration tests, repository contract tests, and staged deployment acceptance covering Local, Preview, and Production.
- Migrate existing bootstrap identities and organization records without duplicating or overwriting live data.

## Capabilities

### New Capabilities

- `supabase-domain-persistence`: Persistent, tenant-isolated storage and retrieval for every LearnTrack production domain, including migration, RLS, repository selection, transactional writes, and deployment verification.

### Modified Capabilities

None. The user-visible behavior remains the same; this change replaces temporary Mock persistence with durable Supabase-backed behavior.

## Impact

- Adds multiple migrations under `frontend/supabase/migrations/` and updates Supabase handoff documentation.
- Changes repository/provider composition under `frontend/src/server/` and removes production dependencies on `src/server/data/mock/`.
- Affects student, class, attendance, class-session, curriculum, study-plan, assessment, account, dashboard, platform-inspection, and audit integration tests.
- Requires an isolated Supabase test environment for destructive RLS and migration verification before Production rollout.
- Deployment must be staged because schema deployment must precede application code that depends on the new tables.
