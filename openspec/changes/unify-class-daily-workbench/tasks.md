## 1. Separated domain contracts and mock data

- [ ] 1.1 Add client-safe material-template, assessment-template, planned-assignment, assessment-result, and combined-workbench contracts; verify TypeScript accepts planned/additional source and correction unions.
- [ ] 1.2 Split resettable mock material and assessment catalogs while preserving deterministic existing student history; verify store reset and relationship tests pass.
- [ ] 1.3 Add planned assessment assignments and session-linked additional result fixtures; verify every organization, student, session, template, and assignment reference resolves.
- [ ] 1.4 Add an explicit migration adapter for existing curriculum assessment placeholders and document ambiguous-row handling; verify migration tests never invent maximum scores for ambiguous content.

## 2. Repository composition and metrics

- [ ] 2.1 Extend the pure class daily-workbench composition with one roster, attendance state, student material plans, planned assessments, templates, and prior results; verify mixed-grade and mixed-version students receive only their own records.
- [ ] 2.2 Derive material completion exclusively from included material learning-item statuses; verify planned and additional assessment writes leave the material numerator and denominator unchanged.
- [ ] 2.3 Derive planned-assessment completion, normalized assessment performance, and additional-assessment count independently; verify planned, waived, corrected, and ad-hoc scenarios.
- [ ] 2.4 Refactor the attendance repository into a cross-class summary/deep-link source while reusing the authoritative occurrence attendance rows; verify date, class scope, and organization filtering.

## 3. Atomic commands, authorization, and corrections

- [ ] 3.1 Add a combined daily-save command with separate attendance, material, and assessment sections plus one session revision; verify safe parsing rejects malformed and oversized payloads.
- [ ] 3.2 Implement section-specific relationship and permission validation for attendance, progress, and assessment management; verify partial-permission, unassigned-class, cross-student, and cross-organization cases.
- [ ] 3.3 Implement all-or-nothing mock staging for attendance snapshots, progress history/current state, assessment assignments/results, and session revision; verify one invalid or stale row leaves every store unchanged.
- [ ] 3.4 Extend completed-session correction to attendance, material, and assessment successor records with required reasons; verify original records remain and summaries use the latest valid values.
- [ ] 3.5 Add coordinated Server Actions and targeted revalidation for daily save, completion, and correction; verify success, validation, forbidden, conflict, and redirect/result behavior.

## 4. Unified class daily-workbench UI

- [ ] 4.1 Restructure `/classes/[classId]?date=YYYY-MM-DD` into attendance, material progress, assessment entry, and history sections using the existing linked breadcrumb Tree; verify route tests cover authorized, read-only, not-found, and scoped access.
- [ ] 4.2 Add compact present/late/leave/absent controls and live attendance summary to each member; verify the scheduled roster defaults to present only for a new occurrence.
- [ ] 4.3 Make leave or absent default material and assessment sections to no-update, with confirmation before discarding entered client drafts; verify cancel and confirm interaction paths.
- [x] 4.4 Preserve multi-entry material progress using only the student's assigned material plans; verify optional notes, add/remove rows, and plan-constrained item selection.
- [ ] 4.5 Add planned-assessment and additional-assessment entry, supporting template search and temporary title/maximum score input; verify invalid scores and missing temporary fields show inline errors.
- [ ] 4.6 Add a pre-save summary and one save action covering affected attendance, material, and assessment counts; verify pending, success, atomic failure, focus, and draft-recovery behavior.

## 5. Attendance overview and student reporting

- [ ] 5.1 Convert `/attendance` into a date-based cross-class overview with status summaries and links to each class daily workspace; verify manager and assigned-teacher scope behavior.
- [ ] 5.2 Update student assessment history to label planned versus additional results and preserve correction indicators; verify filtering and CSV export include the source without changing historical scores.
- [ ] 5.3 Update progress/dashboard views to display material completion, planned-assessment completion, assessment performance, and additional-assessment count separately; verify empty and mixed-result states.
- [ ] 5.4 Add explicit promotion actions for converting an additional assessment into a reusable template or planned assignment without changing the saved result by default; verify no implicit catalog or denominator mutation occurs.

## 6. Documentation and end-to-end verification

- [ ] 6.1 Update class/attendance, curriculum, and student codemaps plus UI-to-backend actions and the user operation manual; verify documented routes and ownership boundaries match the implementation.
- [ ] 6.2 Extend the Supabase handoff with separated tables, foreign keys, indexes, correction audit strategy, one transaction/RPC boundary, and organization/class/student RLS; verify classes do not own material or assessment templates.
- [ ] 6.3 Run Prettier, ESLint, TypeScript, focused tests, the complete test suite, and the production build; verify every command succeeds without unrelated file changes.
- [ ] 6.4 Browser-verify desktop and mobile flows for attendance-first entry, mixed student materials, planned and additional assessments, atomic save/failure, overview deep links, independent metrics, corrections, and zero new console errors.
