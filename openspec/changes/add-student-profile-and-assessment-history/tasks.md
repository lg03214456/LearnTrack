## 1. Data Boundary and Authorization

- [x] 1.1 Add client-safe profile, guardian, assessment, result, filter, summary, trend, command, result, and composed student-detail View Model types; verify strict TypeScript and Client/Server import boundaries
- [x] 1.2 Add `student_profiles.read/manage` and `assessment_history.read/manage` permission codes, catalog dependencies, and persona fixtures; verify authorization tests for owner, admin, teacher, assistant, viewer, and inactive personas
- [x] 1.3 Create normalized resettable mock guardian, assessment, and assessment-result records with organization ownership, dates, maximum scores, revision, and actor metadata; verify all foreign-key-like relationships and score bounds
- [x] 1.4 Define profile and assessment repository contracts plus composition boundaries; verify UI-facing models contain no persistence-row shapes or sensitive guardian data outside student detail

## 2. Student Profile Domain

- [x] 2.1 Implement organization- and assigned-class-scoped profile lookup that resolves active multi-class memberships; verify assigned, unassigned, missing, inactive-enrollment, and cross-organization cases
- [x] 2.2 Implement student and guardian contact update commands with server-derived organization, validation, stable identity, and optimistic revision checks; verify invalid and stale commands make no changes
- [x] 2.3 Verify roster queries remain minimal and do not expose guardian contacts while authorized detail queries include them

## 3. Assessment History Domain

- [x] 3.1 Implement assessment-result history queries ordered by date with academic-term, subject, and pagination filters; verify matching, empty, unavailable, and deterministic ordering cases
- [x] 3.2 Implement normalized latest, average, count, and trend derivation for mixed maximum scores; verify corrections reconcile every derived value
- [x] 3.3 Implement result-entry validation for accessible student, organization-owned assessment, score range, optional comment, and duplicate rules; verify stable validation and authorization outcomes
- [x] 3.4 Implement result correction with stable result identity, optimistic revision, updated timestamp, and actor metadata; verify cross-scope and stale updates fail without mutation

## 4. Student Detail UI

- [x] 4.1 Extend `/students/[studentId]` with a responsive profile header and personal-information section while preserving existing class-return context and study-plan content; verify stable links and multi-class display component tests
- [x] 4.2 Add profile edit interaction through Server Action and profile service with accessible fields, validation/conflict feedback, mock notice, and refresh behavior; verify read-only users cannot see or invoke edit controls
- [x] 4.3 Build assessment summary cards, normalized trend chart, term/subject URL filters, responsive history table/cards, loading, empty, denied, and unavailable states; verify component tests use repository-derived values
- [x] 4.4 Build accessible result-entry and correction interactions through Server Actions and assessment service; verify validation, conflict, success, and preserved input behavior
- [x] 4.5 Verify the combined profile, study-plan, and assessment page at desktop and mobile widths without whole-page horizontal overflow

## 5. Integration, Persistence Handoff, and Quality

- [x] 5.1 Verify owner/admin organization-wide access and teacher/assistant assigned-class scope across profile reads, guardian contacts, assessment history, and mutations
- [x] 5.2 Document PostgreSQL tables, foreign keys, uniqueness and score constraints, date/filter indexes, optimistic revisions, audit strategy, repository replacement order, and Supabase RLS policies
- [x] 5.3 Update system architecture, codemap, UI/backend action diagrams, and requirement-viewing guidance for the composed student-detail route and new boundaries; verify every documented path exists
- [x] 5.4 Run relationship, repository, service, authorization, component, route, and browser tests, then run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; report warnings separately and state that production persistence still requires Supabase migrations, Auth, and RLS
