## 1. Class Domain and Mock Persistence

- [x] 1.1 Define client-safe class overview, editor option, aggregate form, lifecycle, schedule slot, command result, capability, and expected-attendance contracts; verify strict TypeScript and Client/Server import boundaries
- [x] 1.2 Normalize resettable mock class subjects, grade scopes, teacher assignments, weekly schedule slots, and enrollment lifecycle records while preserving existing stable class IDs; verify every relationship, uniqueness rule, reset operation, and existing roster query in automated tests
- [x] 1.3 Implement atomic mock-store create/update/lifecycle/enrollment operations with revision increments and rollback-on-validation semantics; verify failed aggregate mutations make no partial changes

## 2. Repository Read Boundaries

- [x] 2.1 Add an organization- and actor-scoped class-management repository that returns authoritative overview cards, search/grade filtering, enrollment counts, capacity, schedules, and lifecycle state; verify owner, assigned-teacher, inactive, archived, and cross-organization cases
- [x] 2.2 Add class editor queries for stable teacher, subject, grade, student, current enrollment, and schedule options without exposing persistence rows; verify create and edit View Models reconcile with normalized records
- [x] 2.3 Add a local-date expected-attendance query that joins active class schedules and active enrollments without duplicates; verify weekday matching, schedule changes, completed/archived classes, ended enrollments, organization scope, and preservation of existing attendance sessions

## 3. Service Rules and Server Actions

- [x] 3.1 Implement create-class service validation for owner/admin permission, organization-derived scope, unique trimmed name, class type, grade scope, valid references, positive optional capacity, schedule ranges, duplicates, and initial enrollment capacity; verify valid standard and empty self-study creation plus every rejection path
- [x] 3.2 Implement aggregate edit with assigned-teacher scope, protected teacher/lifecycle fields, optimistic revision, complete relationship replacement, and atomic capacity checks; verify stale, unauthorized, cross-organization, and successful outcomes
- [x] 3.3 Implement enrollment add/withdraw commands with stable identities, duplicate and capacity protection, ended-enrollment history, and revision checks; verify multi-class membership and historical records remain intact
- [x] 3.4 Implement owner/admin completion and archival commands with explicit confirmation, active-selector exclusion, immutable history, and no hard-delete path for classes with history; verify direct unauthorized and destructive attempts are rejected
- [x] 3.5 Add Server Actions that parse untrusted aggregate input, derive actors, map stable field/global errors, preserve failed input, revalidate affected class/student/attendance routes, and redirect only on success; verify action-to-service mapping tests

## 4. Class Overview and Editor UI

- [x] 4.1 Refactor `/classes` to use the class-management repository and render name, type, subjects, grades, teacher, ordered schedules/rooms, enrollment count/capacity, lifecycle status, progress, and empty/filter states; verify displayed metrics reconcile with repository data
- [x] 4.2 Add capability-aware card actions for shared student roster, edit, complete, and archive while retaining `/students?classId=<id>`; verify teachers and read-only personas see only permitted actions
- [x] 4.3 Add `/classes/new` with accessible sections for required basics, class type, multi-subject, grade/all-grade selection, teacher, optional capacity, dynamic schedule rows, and searchable optional initial-student selection; verify successful submit and field-level failure recovery
- [x] 4.4 Add `/classes/[classId]/edit` using the same focused editor with revision, current relationships, assigned-teacher restrictions, enrollment management, and unavailable/read-only states; verify reload and stale-conflict behavior
- [x] 4.5 Add accessible completion/archive confirmation and stable success/error presentation without hiding server enforcement; verify cancel makes no mutation and successful lifecycle changes remove the class from active operational selectors

## 5. Schedule and Attendance Integration

- [x] 5.1 Build dynamic weekly schedule controls with weekday, start, end, optional room, add/remove, deterministic ordering, duplicate/range validation, and mobile keyboard operation; verify component and service tests
- [x] 5.2 Replace the attendance expected-student read path with the recurring schedule query while preserving the current status-entry interaction and historical sessions; verify the selected date produces only scheduled active class enrollments

## 6. Persistence Handoff, Documentation, and Quality

- [x] 6.1 Document Supabase tables, foreign keys, unique/index constraints, lifecycle dates, revision/transaction strategy, audit events, expected-roster JOIN, and RLS policies for owner/admin/assigned-teacher access; verify every documented implementation path and contract exists
- [x] 6.2 Update system architecture, Code Map, and UI/backend action diagrams for create/edit routes, class service/repository/store, normalized relationships, lifecycle flow, and attendance schedule query
- [x] 6.3 Run domain, mock relation, repository, service, authorization, action, component, route, and regression tests; then run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`, reporting warnings separately
- [x] 6.4 Verify class overview, create/edit, schedule, enrollment, confirmation, teacher/read-only scope, attendance integration, long labels, validation, keyboard flow, and no whole-page horizontal overflow at desktop and mobile widths in browser testing
