## Context

See proposal.md for the motivation. StudentRosterEditor already saves basic information and classIds together using saveStudentRosterStateAction and returns the saved identity/revision in result.values. Material setup currently submits createPlanAction, which redirects to the plans tab. StudentExamRanges owns a private editor and refreshes after save. StudentStudyPlansView renders active and historical plans together. These existing operations provide the persistence boundaries to reuse.

## Goals / Non-Goals

**Goals:** Compose existing saves into a recoverable three-step modal; keep every saved student identified; give the profile direct maintenance and truthful setup status; present daily progress before history.

**Non-Goals:** A cross-step database transaction, new persistent onboarding flags, new tables or dependencies, student login provisioning, class-to-material automation, changing active-plan uniqueness, scores or range percentages, and broad redesign of unrelated pages.

## Decisions

### Explicit workflow state, existing persistence

Own a small discriminated state machine in the students feature: basic, materials, range, complete, plus saved student identity/revision and known save outcomes. Keep draft state per step, not duplicated in unrelated global stores. Initial creation happens exactly once per confirmed saved identity; revisiting basic information updates that record. Do not silently use a new create intent when an existing student identity is missing or inaccessible.

Each step uses existing typed Server Action → service → repository → provider boundaries. No global transaction: later deferral or failure cannot roll back already committed records. In ambiguous network/audit outcomes, show saved-state uncertainty and require record confirmation rather than automatic creation retry. Session/org/student context changes invalidate local form state and outstanding responses.

### Non-redirecting material action and reusable forms

Add a typed result-returning plan setup action while retaining the existing redirecting createPlanAction for compatibility. Share the same authentication, validation, domain service, audit and invalidation logic; do not duplicate plan replacement rules. A replacement on an existing same-term/subject slot requires explicit confirmation. The workflow re-reads the saved student's plans and range workspace after mutations before advancing; no fabricated IDs or treating unsaved templates as learning items.

Extract the existing exam-range form into a reusable form body with save/cancel callbacks. The standalone range editor and wizard each supply their own modal shell, never nested dialogs. Reuse existing permissions and normalized selections. The materials step permits continued assignment under existing rules; continuing to ranges uses the final saved snapshot.

### Incremental saves and completion choices

The first step offers save and continue or save and finish; subsequent optional steps offer save and continue plus later setup. The summary states which records were actually saved. Finish can open the student profile or reset the workflow for another student; reset must clear form/action results as well as selected student IDs. Closing an unstarted first step writes nothing; closing later steps leaves confirmed saved records intact. Pending saves block Escape, backdrop, close and duplicate submit.

### Profile maintenance and setup summary

Add compact, permission-aware controls near the student identity/class display for editing basic information/classes and continuing setup. Use repositories or typed scoped read actions to obtain required form DTOs; the browser does not read tables or import stores. Prefer one batched scoped setup read over N+1 calls and do not load full study plans/range options on every unrelated tab merely to draw badges.

Compute class/material/range status from existing rows; do not introduce competing onboarding booleans. Distinguish not set, saved, unavailable and not permitted. Class membership can be empty legitimately; users without class-management permission keep existing classes unchanged, not replaced with an empty array. Do not infer material assignment from class labels. Keep existing direct edit entries available.

### Current versus historical plans

Keep StudentExamRanges first in the plans tab. Split plan rendering by active versus non-active status; reuse a plan-card presentation to avoid two implementations. Put completed/replaced/archived/draft records in a labeled initially collapsed historical/non-active area with original status badges. Retain item update controls only where existing active-plan rules permit. Do not alter original percentages in this UX-only change, even when old plan metrics look counterintuitive; range percentage rules remain independent.

## Risks / Trade-offs

- [Later step fails after student creation] → Summary and messages explicitly retain earlier saved state; use existing identity for retry/resume.
- [Ambiguous creation result] → No automatic retry; reload roster and confirm the created record before starting another create.
- [Read/write permissions differ by step] → Gate each read/write server-side and show defer/unavailable states rather than broadening access.
- [Previous student data leak through reused modal state] → Key/reset by actor/org/student context, ignore outdated async results and test switching plus add-another.
- [Extra profile status queries slow navigation] → Load lightweight scoped setup summaries only when needed; load editor options lazily and test request counts.
- [Exam migration not installed] → Show a local range-unavailable state and allow finishing prior saved steps, never fallback to Mock.

## Migration Plan

No new schema or environment variables are expected. Reuse the previous student-exam-range migration where that feature is enabled. Deploy the new typed actions with the UI, retaining existing redirecting actions and independent editors. Rolling back the UI leaves all separately saved students, enrollments, plans and ranges intact. Shared-database browser writes and Preview/Production acceptance require scoped authorization; use isolated fixtures for destructive/concurrency tests.
