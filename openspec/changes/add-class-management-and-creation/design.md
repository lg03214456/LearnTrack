## Context

See `proposal.md` for motivation and the two capability specs for observable behavior. The current `/classes` page reads display-oriented mock data and links to `/students?classId=<id>`, while enrollments already provide normalized class membership for the student roster. There is no class write boundary, recurring schedule model, creation/edit route, or transactional way to create related assignments and enrollments.

The implementation must preserve the existing URL-backed student roster, LearnTrack RBAC and organization scope, Client/Server boundaries, and future Supabase replacement described in `docs/engineering-standards.md`.

## Goals / Non-Goals

**Goals:**

- Make class, assignment, schedule, and enrollment data authoritative and reusable across overview, roster, and attendance.
- Keep multi-step creation atomic at the service/store boundary and return stable field/global errors.
- Support a focused create/edit experience without placing server data or authorization logic in Client Components.
- Preserve history through lifecycle transitions and revision checks.
- Shape mock contracts so a Supabase repository can replace them without changing UI View Models.

**Non-Goals:**

- Permanent deletion of classes that have enrollments or operational history.
- One-off schedule exceptions, holiday calendars, cross-midnight slots, room conflict optimization, payroll, or teacher workload planning.
- A separate class-specific copy of the student roster.
- Supabase migrations or production authentication in this change.

## Decisions

### Use focused create and edit routes

Use `/classes/new` for creation and `/classes/[classId]/edit` for editing. The overview keeps compact card actions for roster, edit, and lifecycle change. A large modal was considered but rejected because schedules and initial student selection need enough space, browser navigation, validation recovery, and mobile usability.

### Normalize class relationships

Keep class identity and scalar fields separate from `class_subjects`, `class_grade_scopes`, `class_teacher_assignments`, `class_schedule_slots`, and existing `enrollments`. The mock store exposes class-oriented snapshots and atomic mutation methods; repositories map normalized records to client-safe editor and overview View Models. Arrays embedded inside one class fixture were rejected because they obscure ownership, uniqueness, and future SQL JOIN behavior.

### Submit a complete editable class aggregate

The create/edit form submits one command containing the scalar class fields plus complete subject, grade, schedule, teacher, and selected-student sets. The Server Action validates external input and obtains the actor; `ClassManagementService` enforces permission, organization ownership, referenced-record scope, duplicate name, capacity, lifecycle, schedule, and revision rules before one store transaction. Independent per-row writes were rejected because they can leave partially created classes.

### Separate authority from UI visibility

Owners and administrators with `classes.manage` may create, edit, complete, or archive organization classes. Assigned teachers with the same permission may edit their assigned active classes and enrollment/schedule configuration but cannot create, reassign ownership, complete, or archive. Client controls reflect these capabilities, while direct commands remain server-enforced.

### Model lifecycle instead of destructive deletion

Use `recruiting`, `active`, `completed`, and `archived`. Completed/archived records remain queryable for historical reports but are excluded from active selectors and future attendance generation. A hard-delete service is intentionally absent in the first version; this avoids orphaning attendance, grades, progress, or enrollment history.

### Resolve attendance expectations by local date

Weekly slots store ISO-like weekday numbers plus local `HH:mm` values and optional room text. An attendance-facing repository query accepts organization, actor scope, and a local calendar date, matches active slots, and joins active enrollments. Existing attendance UI can consume this result without importing class fixtures. Time-zone conversion, holidays, and one-off exceptions remain future extensions.

### Keep wizard state client-safe

The editor may present sections or steps, but all options arrive as serialized View Models from the Server Page. Searchable initial-student selection filters provided organization student options locally for the first mock dataset; the contract allows future server search. Draft form state stays in the Client Component and is preserved on validation failure.

## Risks / Trade-offs

- [A complete aggregate command can become large] → Keep bounded multi-selects for the first dataset and define future server-search pagination without changing selected stable IDs.
- [Teacher permissions may be confused with administrative ownership] → Return explicit capabilities in the editor View Model and enforce actor scope again in the service.
- [Schedule changes could rewrite history] → Apply rules only to future expected-roster queries; never mutate existing attendance sessions.
- [Capacity and enrollment updates can race] → Check revision and capacity inside the same transaction/store mutation.
- [Multiple schedules can overlap] → Reject exact duplicates now; document broader teacher/room collision detection as a future capability.
- [Mock persistence resets on restart] → Label development-only behavior and maintain a Supabase handoff for transactions, unique constraints, indexes, audit, and RLS.

## Migration Plan

1. Add client-safe contracts and normalized resettable mock records with relationship invariants.
2. Add organization-scoped repositories for overview/editor options and expected attendance rosters.
3. Add service commands and Server Actions for create, edit, enrollment, completion, and archival.
4. Add create/edit routes and refactor overview cards to use authoritative class summaries and capability-aware actions.
5. Feed recurring schedule results into the current attendance read path without changing historical records.
6. Add component, repository, service, authorization, route, responsive, and browser tests; update architecture/action documentation.
7. For Supabase, create normalized tables and constraints, backfill class fixtures, add transactional RPC/repository behavior and RLS, then switch the composition root.

Rollback removes the new routes and mutation entry points while retaining normalized class/enrollment data, which remains compatible with the existing overview and student roster.
