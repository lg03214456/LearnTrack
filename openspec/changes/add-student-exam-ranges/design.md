## Context

See proposal.md for motivation and specs/student-exam-ranges/spec.md for behavior. StudentStudyPlansView currently renders plan-level percentages from curriculum-core.ts. The source already contains per-student learning-item snapshots and preserved historical plans; these are the authoritative records, not curriculum template items or assessment scores. Curriculum writes use typed Server Actions, audit wrapping, provider-aware services and authenticated guarded RPCs.

## Goals / Non-Goals

**Goals:** Store coverage separately from progress; reuse existing item identities, student visibility and study-plan permissions; support multiple ranges and assigned materials without rewriting completed history.

**Non-Goals:** Class-wide defaults, assessment score aggregation, automatic version migration, deleting learning records, changing current plan replacement rules or adding new infrastructure/dependencies.

## Decisions

### Student-owned ranges, not template metadata

Add `student_exam_ranges` (id, organization_id, student_id, name, exam_date nullable, revision, timestamps) and `student_exam_range_items` (organization_id, student_id, range_id, study_plan_id, learning_item_id). Use a unique range/item membership and composite FKs or equivalent constraints/triggers enforcing tenant, student and plan relationships. Index organization/student, range memberships and item references; avoid cascade deletion of learning history. This supports one range drawing from several assigned plans. Storing a range on templates or a class would incorrectly share personal coverage.

Add validated immutable-source references rather than copying titles/statuses; reads join retained plan/version/item records. Saves never update plan, item or assessment rows. Range name length and selection-size bounds are validated consistently in UI/service/SQL. Date is optional; use a date-only value with no timezone conversion.

### Count distinct terminal learning content

The selection UI groups content by assigned plan with explicit version labels. Unit selection expands to descendant countable items; units are not double-counted alongside their children. A unit without countable descendants cannot create a nonempty range. Existing learning snapshots lack parent relationships in the student-facing DTO, so the repository must join source item relationships, retain custom-item eligibility and expose a normalized selection model. Guard the same rules server-side.

Every explicitly selected countable item contributes once to the denominator, including skipped or subsequently removed items. Only `completed` contributes to the numerator. Assessment-type learning items, if selected, use their completion status, never their numeric score. Keep counts derived in one pure builder reused by provider outputs and tests; do not persist percentage totals. Show an empty state rather than 0% before any range exists.

### Explicit handling of plan changes

Creation selects active-plan content only. Existing ranges keep their original references; reads flag replaced/archived plans or removed items as needing review. Editing shows retained historical selections with their original version and allows removal, while new selections come only from the student's active plans. No automatic transfer by title or lineage, and no removal merely to increase completion percentage. This avoids silently redefining a previously configured examination.

### Provider and authorization boundaries

Keep contracts under the curriculum feature; add a focused range repository interface with Mock and Supabase implementations plus an orchestration service. Read routes compose range data with the existing study-plan view through repository interfaces; UI never imports persistence clients or stores. Mutations cross a typed Server Action, server-resolved actor, service validation and repository save, using existing audit conventions without logging names or selected payloads.

Add dedicated read/save RPCs rather than replacing the large curriculum workspace function. Both enforce `private.can_access_student` with `study_plans.read` or `study_plans.manage` and validate every relationship. Use authenticated user JWTs, fixed search_path, RLS, explicit grants/revokes and no direct authenticated table writes. Platform mutation is rejected, and any supported inspection reads remain explicitly targeted and read-only. Do not introduce a service-role fallback.

Atomic saves lock the student's row in the same order as plan replacement before locking plans/range, recheck plan eligibility and expected range revision, then replace memberships and increment revision in one transaction. This prevents races against replacement or concurrent range saves. New saves use an explicit create mode; edited identifiers must never silently create a new range. Required Audit failures follow existing fail-closed behavior and must not be reported as successful saves.

### Dialog interaction

Add a range section before existing plan cards, with create/edit actions only for managers. Reuse the existing accessible responsive dialog conventions: one active dialog, labels, keyboard dismissal/focus return, loading/error states, pending protection and cancel without mutation. Retain current plan controls and metrics, labeling plan-level and range-level progress distinctly. Refetch/invalidate the student detail on successful save and existing item status updates so range percentages do not become stale.

## Risks / Trade-offs

- [Extra query cost] → Read ranges in a scoped batch rather than per card; use indexes and measure before adding cache state.
- [Source hierarchy missing in snapshots] → Normalize hierarchy from source items at the repository boundary; test custom items and orphan/missing relationships without guessing from titles.
- [Old ranges reference replaced plans] → Preserve references and denominator, show review warnings, require explicit edits.
- [Missing migration could break unrelated student tabs] → Fetch range data on the plans tab with a distinct unavailable state; do not fabricate an empty range list or hide existing progress.
- [Shared database is used for testing and production] → Produce migration and preflight queries only; no automatic application or destructive live testing. Real JWT/RLS verification needs isolated test actors/environment.

## Migration Plan

1. Implement the additive migration, constraints, indexes, RLS and guarded RPCs, then validate in isolated PostgreSQL and static migration tests. Existing student data receives no seeded exam ranges.
2. Supply preflight SQL checking prerequisite tables/helpers and naming conflicts. User applies migration to the intended Supabase project after backup; no existing policies or tables are dropped.
3. Deploy application code only after schema readiness, retaining all existing environment variables. Missing schema yields an explicit unavailable state for this feature.
4. Verify separate-student persistence, tenant denial, create/edit/cancel/conflict and progress refresh with approved disposable records; separately record Preview/Production acceptance.
5. Roll back application UI if needed while retaining additive tables/data. Do not drop saved coverage or reverse learning history as part of rollback.
