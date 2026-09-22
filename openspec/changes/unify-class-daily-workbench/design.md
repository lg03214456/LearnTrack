## Context

See `proposal.md` for motivation and the two delta specs for observable behavior. LearnTrack currently has a class-session workspace for material progress, a separate attendance view whose edits are client-local, material template items that include worksheet and assessment placeholder types, and a separate student assessment-history service. The current completed class-session change intentionally consumes attendance rather than replacing its page, so this design introduces a coordinating boundary while preserving existing records and permissions.

## Goals / Non-Goals

**Goals:**

- Compose one roster and occurrence view from class schedule, enrollment, attendance, active material plans, planned assessments, and recorded results.
- Keep attendance, material progress, assessment planning, and assessment results independently queryable and auditable.
- Use one validated transaction boundary for a submitted daily batch without making one wide session table.
- Preserve existing student material progress and assessment history during the mock-first migration.
- Shape the contracts for a future Supabase transaction and organization/class/student RLS.

**Non-Goals:**

- Uploading or authoring assessment files, answer keys, questions, or licensed publisher content.
- Automatically converting every temporary assessment into a reusable template.
- Deriving material completion from notes, scores, page numbers, or assessment volume.
- Removing the organization-wide attendance reporting surface.
- Deploying Supabase migrations or production authentication in this change.

## Decisions

### 1. Merge the workbench, not the domain tables

`ClassSession` is the occurrence aggregate. It references member snapshots, while attendance, material progress, and assessment results remain normalized child records. A daily-workbench repository composes a client-safe view model, and one orchestration service validates and stages all submitted sections.

Alternative rejected: store attendance, progress, and scores as columns or JSON on one session-member row. That makes multiple progress and assessment entries, corrections, indexes, RLS, and reporting harder.

### 2. Make the class route primary and attendance route supervisory

`/classes/[classId]?date=YYYY-MM-DD` remains the teacher's primary daily entry point and gains attendance, material, assessment, and history sections. `/attendance?date=...` becomes a cross-class overview with summaries and deep links to the same class occurrence.

Alternative rejected: retain two editable roster forms. It duplicates selection and creates conflicting save ownership.

### 3. Preserve independent permission gates

The composed view exposes `canManageAttendance`, `canManageProgress`, and `canManageAssessments`. The orchestration service validates every non-empty section against its permission and scope. Hiding a section is never the authorization boundary.

Alternative rejected: introduce one broad `class_session.manage` permission. It would silently expand access for roles intentionally allowed to manage only attendance or only learning records.

### 4. Use one atomic command with section-specific payloads

The save command contains the session revision and separate arrays for attendance changes, material entries, and assessment entries. The service validates the entire relationship chain before replacing mock snapshots. The Supabase adapter will call one PostgreSQL function or transaction using the same command semantics.

Alternative rejected: fire three independent client actions. Partial network or validation failure could leave attendance saved while progress and scores remain stale.

### 5. Separate material and assessment masters

Material templates and immutable versions retain unit/chapter/material structure. Assessment templates own assessment metadata such as title, subject, grade, maximum score, and reusable tags. Material items no longer need assessment placeholders for grading behavior; migration maps existing placeholders to assessment definitions only when their meaning is unambiguous.

Alternative rejected: a single generic template with a type discriminator. Material versioning and assessment scoring have different lifecycle, assignment, completion, and reporting behavior, and the shared table would keep leaking conditional fields into every workflow.

### 6. Model planned assessments separately from results

`StudentAssessmentAssignment` answers what the student is expected to complete and supplies the planned denominator. `StudentAssessmentResult` answers what the student actually completed and may reference an assignment, an assessment template, both, or neither for a temporary entry. Result rows snapshot title and maximum score so history remains stable if a template changes.

```text
StudentAssessmentAssignment
- id, organizationId, studentId, termId
- assessmentTemplateId
- status: assigned | completed | waived
- dueDate?, completedResultId?, revision

StudentAssessmentResult
- id, organizationId, studentId
- classSessionId?, sessionMemberId?
- assignmentId?, assessmentTemplateId?
- titleSnapshot, maximumScore, score
- source: planned | additional
- comment?, recordedBy, recordedAt
- supersedesId?, correctionReason?, revision
```

Alternative rejected: infer planned completion from all result rows. Additional practice would continually enlarge or distort the denominator.

### 7. Calculate four independent summaries

- Material completion: completed included material items / included material items.
- Planned-assessment completion: completed non-waived assignments / active non-waived assignments.
- Assessment performance: normalized score percentages across the authorized filtered result set.
- Additional-assessment count: result rows whose source is `additional`.

No summary writes a percentage column; repositories derive them from authoritative rows.

### 8. Confirm attendance-driven destructive UI transitions

Present is the default for a newly generated roster. Changing a member to leave or absent sets proposed material and assessment entries to no-update only after confirmation when the teacher has already entered data. The UI does not delete persisted history; completed-session corrections remain append-only.

## Risks / Trade-offs

- **A large combined batch can fail because one row is stale** → Identify the member and section while leaving the entire command unapplied; refresh and retain client draft input where possible.
- **The unified card can become visually dense** → Use a compact attendance control and progressive sections or tabs for material and assessments, with per-member summaries when collapsed.
- **Existing assessment placeholders are ambiguous** → Keep a deterministic migration map and leave uncertain rows as material notes rather than invent scoring metadata.
- **Mock storage can be mistaken for persistence** → Retain the Mock warning and document that restart loses unsaved seeded changes until the Supabase adapter exists.
- **Permission combinations increase test cases** → Test read-only and manage combinations per section plus organization and assigned-class scope at the service boundary.

## Migration Plan

1. Add separated client-safe material, assessment-template, assignment, result, and combined-workbench contracts.
2. Add normalized resettable mock fixtures and a deterministic adapter for existing assessment history and material placeholders.
3. Build pure repository composition and independent summary derivation before changing routes.
4. Add the atomic daily-workbench service and Server Action while preserving the current material-only action during transition.
5. Replace the class-session UI with attendance, material, assessment, and history sections; change `/attendance` into an overview/deep-link surface.
6. Update student history and dashboard summaries to show the four independent metrics.
7. Update codemaps, user flows, Supabase table/index/RLS/transaction handoff, and complete regression/browser verification.

Rollback switches the class route back to the existing material-only component and restores the previous attendance view. Existing attendance, material-progress, and assessment-result rows remain intact because the migration adds normalized records instead of rewriting historical facts.
