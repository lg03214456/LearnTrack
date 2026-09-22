## Context

See `proposal.md` for motivation and `specs/class-daily-student-progress/spec.md` for behavior. LearnTrack already separates class enrollment from student study plans, snapshots curriculum items into `student_learning_items`, derives progress from those items, and enforces mock RBAC at server boundaries. It has no `/classes/[classId]` workspace, persisted class-session occurrence, or dated link between a class session and a student's learning-item change.

## Goals / Non-Goals

**Goals:**

- Keep class membership, student curriculum assignment, attendance, and learning progress as separate but joinable concepts.
- Give teachers one mixed-grade roster workspace without creating a class-level curriculum binding.
- Preserve both the latest student learning-item state and a traceable record of what was entered in each class session.
- Shape mock records and service commands so a Supabase adapter can later use one PostgreSQL transaction and RLS policies.
- Support correction history, optimistic conflict checks, and all-or-nothing batch saves.

**Non-Goals:**

- Supabase migrations, Auth, RLS deployment, or production persistence.
- Parsing page numbers, calculating progress from notes, or requiring notes.
- Automatically choosing a different curriculum version or creating missing study plans from the daily workspace.
- Replacing the existing attendance page; this change consumes attendance state and links to it.
- Recording scores or assessment attempts in the daily progress entry.

## Decisions

### 1. Model a session occurrence separately from its student entries

A `ClassSession` represents one dated occurrence and retains a roster snapshot reference even if enrollment changes later. A `StudentSessionProgress` represents one learning-item result for one student in that occurrence. This allows a student to have multiple entries in a session and avoids wide, repeating columns on the session row.

Alternative rejected: storing a JSON roster and progress payload only on the class session. That is convenient for a prototype but makes relational validation, correction history, reporting, indexes, and RLS harder.

### 2. Use each student's plan as the only curriculum source

The repository joins session members to active `StudyPlan` and `StudentLearningItem` rows. Class records never contain a curriculum-version foreign key. The UI groups or labels rows by the resolved student plan, but does not imply all students share a version.

Alternative rejected: a class default with per-student overrides. It conflicts with the product rule that mixed-grade members are independently assigned curricula.

### 3. Keep notes unstructured and optional

The progress entry has one nullable `note` string. Text such as page position or exercise number remains presentation-only context. No `page_from`, `page_to`, or page-based percentage exists.

Alternative rejected: structured page fields. Publishers and custom materials do not share reliable pagination, and the user only needs a quick teacher note.

### 4. Separate current state from immutable history

`StudentLearningItem.status` remains the source for current progress and derived completion. Every session save appends a `StudentSessionProgress` history record carrying `statusAfterSession`. A correction appends a successor record with `supersedesId` and a required correction reason; it does not erase the original.

This provides two distinct answers:

- current state: where the student is now;
- session history: what the teacher recorded in a particular class occurrence.

### 5. Define explicit record structures

The mock-first domain records map directly to future PostgreSQL tables:

```text
ClassSession
- id
- organizationId
- classId
- sessionDate
- scheduleId?              optional source schedule
- teacherProfileId
- status                    draft | completed
- createdAt
- completedAt?
- revision

ClassSessionMember
- id
- organizationId
- classSessionId
- studentId
- enrollmentId
- attendanceStatus         pending | present | late | leave | absent

StudentSessionProgress
- id
- organizationId
- classSessionId
- sessionMemberId
- studentId
- studyPlanId
- learningItemId
- statusAfterSession       pending | in_progress | completed
- note?                    unstructured optional text
- recordedBy
- recordedAt
- supersedesId?            previous record when correcting
- correctionReason?        required for corrections
- revision
```

The session-member record preserves who was expected in that occurrence. `StudentSessionProgress` deliberately repeats `studentId` and organization scope for efficient policy validation and auditing, while services verify the complete relationship chain.

### 6. Treat `本次不更新` as absence of a progress entry

No-update is a UI command state, not a learning status and not a stored progress row. Leave and absent members default to it. This prevents an attendance choice from accidentally resetting learning progress.

### 7. Save a complete submitted batch through one service boundary

The Server Action parses a client-safe command and calls one service. Before writing, the service validates active membership, `progress.manage`, organization and assigned-class scope, session revision, roster membership, active plans, and ownership of every learning item. Only after all entries pass does the repository append history and update current statuses.

The mock adapter stages copies before replacing arrays. The future Supabase adapter performs the same operation inside a PostgreSQL transaction with foreign keys, unique constraints, optimistic revision checks, and RLS.

### 8. Make the class detail route the primary daily entry point

`/classes/[classId]?tab=today&date=YYYY-MM-DD` is the stable workspace URL. Other tabs can later expose roster, history, and settings. Existing `/students?classId=...` remains the filtered directory, and `/students/[studentId]?tab=sessions` remains the student-history view.

The daily UI uses per-student expandable rows or compact panels rather than a horizontally oversized table. Each row shows attendance, active plan/version labels, selected learning item, status, optional note, and an add-entry control.

## Risks / Trade-offs

- **The active curriculum-template change is not fully implemented** → Build on existing `StudyPlan` and `StudentLearningItem` structures only; do not silently create plans in this workflow.
- **Mixed curricula increase roster density** → Default each student to the current `in_progress` item and collapse additional entries until requested.
- **A large class batch can fail because of one stale row** → Return the affected student/entry conflict clearly and keep the entire batch unsaved so history and current state never diverge.
- **Mock history is lost on server restart** → Keep the existing Demo warning and document that persistence starts with the Supabase adapter.
- **Attendance and progress could drift** → Store the session-member attendance snapshot but keep attendance management authoritative in its own service; refresh the workspace after attendance changes.
- **Correction rows increase storage** → Accept append-only growth for auditability and index by organization, session, student, and recorded time.

## Migration Plan

1. Add client-safe session/progress contracts and normalized resettable mock records.
2. Add repository joins for class, roster, attendance, student plans, versions, and learning items.
3. Add service commands for opening a session, saving a validated batch, completing a session, and appending corrections.
4. Add `/classes/[classId]` daily workspace, class-card entry action, and student-history rendering.
5. Add permission, relationship, atomicity, UI interaction, accessibility, and route tests.
6. Update codemaps, action flow documentation, and the Supabase handoff schema/RLS/transaction notes.

Rollback removes the new route and navigation entry and stops composing the session repository. Existing class, attendance, student plan, and aggregate progress data remain intact.
