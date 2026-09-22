## Why

LearnTrack currently has empty `frontend` and `backend` directories but no runnable product surface. A mock-data-first dashboard is needed to validate the tuition-center workflows and visual hierarchy from the five supplied references before database and permission decisions are made irreversible.

## What Changes

- Create a responsive first-version administration shell with sidebar navigation, header actions, cards, filters, tables, progress indicators, badges, charts, and mobile-friendly behavior.
- Provide five usable views: student progress overview, student roster, course/classes, attendance, and learning analytics.
- Centralize typed mock data behind a repository-shaped interface so UI components do not import scattered literal data.
- Define loading, empty, filtering, pagination, and detail interaction behavior for the mock experience.
- Establish the future Supabase boundary: PostgreSQL tables, Auth identity mapping, organization-scoped RLS, repository replacement, and staged connection steps.
- Keep this change database-free: it must not require a Supabase account or secrets to run.

## Capabilities

### New Capabilities

- `learning-admin-dashboard`: Teacher and administrator dashboard navigation and read-oriented management views for students, classes, attendance, progress, and analytics.
- `mock-learning-data`: Typed, deterministic mock records and asynchronous repository contracts that can later be replaced by Supabase repositories.

### Modified Capabilities

None.

## Impact

- Affects the currently empty `frontend/` project and introduces its initial application structure and dependencies.
- Documents the contract expected from the future `backend/` or Next.js server layer without connecting to a live database in this change.
- No existing APIs, data, or users are migrated; there are no breaking changes.
