## Why

LearnTrack currently stores only aggregate lesson counts and cannot explain which grade, subject, publisher version, chapter, worksheet, or assessment a student is following. Versioned curriculum templates and term-specific study plans are needed before daily progress entry and student dashboards can produce stable, traceable results.

## What Changes

- Add organization-owned grade, subject, publisher, academic-term, curriculum-template, and immutable template-version records.
- Add ordered template items for chapters, units, teaching materials, worksheets, and assessment placeholders.
- Allow authorized staff to create, edit drafts, publish versions, archive templates, and copy an existing template into a new draft.
- Distinguish existing class enrollment from a student's term-specific subject study plan.
- Bind each student subject plan to one explicit grade, subject, and published template version.
- Materialize student learning-item snapshots when a study plan is activated so later template edits do not rewrite history.
- Support student-specific title, ordering, inclusion, and custom-item adjustments without modifying the source template.
- Add curriculum and study-plan permission codes integrated with the existing organization and class-scoped RBAC boundary.
- Provide mock-first curriculum and student study-plan screens and repositories while preserving future Supabase/PostgreSQL replacement boundaries.

## Capabilities

### New Capabilities

- `curriculum-template-library`: Defines grade/subject/publisher dimensions, versioned curriculum templates, ordered content, copying, publication, and archival behavior.
- `student-study-plans`: Defines academic-term subject bindings, template application, personalized learning-item snapshots, individual adjustments, and study-plan access control.

### Modified Capabilities

None.

## Impact

- Adds curriculum and study-plan feature modules, routes, domain types, mock fixtures, repositories, services, server actions, navigation items, and tests.
- Extends the permission catalog and uses current `AuthorizationContext` organization/class scope rather than trusting client-submitted tenant or role data.
- Replaces aggregate-only progress assumptions with traceable student learning items while keeping existing progress pages operational during migration.
- Requires no external package or Supabase migration in this change; documentation will specify future normalized tables, indexes, foreign keys, and RLS policies.
