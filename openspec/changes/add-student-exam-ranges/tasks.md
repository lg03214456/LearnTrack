## 1. Contracts and progress rules

- [x] 1.1 Add student exam-range commands, records, selection DTOs and view models; verify typecheck and contract tests cover explicit create/edit revisions, optional date and student ownership.
- [x] 1.2 Implement a pure selection/progress builder with hierarchy normalization; verify tests for unit descendant expansion, deduplication, custom items, 6/10 = 60%, skipped/removed denominator retention, empty state and no score/note influence.
- [x] 1.3 Implement version-review flags and explicit historical selection handling; verify plan replacement preserves range references and completion history without automatic migration.

## 2. Persistence and authorization

- [x] 2.1 Add additive range/membership tables, tenant/student/plan/item relationship constraints, indexes and revisions; verify static migration tests and isolated PostgreSQL reject mismatched and orphaned memberships.
- [x] 2.2 Add read/save guarded RPCs, RLS and grants/revokes using existing student visibility helpers; verify owner/assigned teacher allow and cross-tenant/unassigned/read-only/anonymous/platform mutation deny in isolated tests.
- [ ] 2.3 Implement transactional save locking consistent with plan replacement, expected revision and all-or-nothing selection replacement; verify invalid saves, stale edits, concurrent creation/edit and replacement races cannot partially write or overwrite data.
- [x] 2.4 Add focused Mock/Supabase repository adapters behind one interface and service validation; verify provider parity, JWT-scoped reads/writes, missing-migration/network fail-closed and no live-data/mock fallback.
- [x] 2.5 Add typed Server Actions with server-resolved actor, safe results, required audit and student-page invalidation; verify action tests for validation, scope denial, audit failure, conflict and success refresh without logging sensitive payloads.

## 3. Student progress interface

- [x] 3.1 Add a responsive accessible create/edit dialog grouped by assigned material and version, name/date fields and unit/item selection; verify component tests for independent student ranges, cancel, empty choices, pending controls, keyboard dismissal and focus return.
- [x] 3.2 Render range cards with completed/total/percentage, explicit material versions and review warnings; verify component tests and existing plan controls/percentages remain available and unchanged.
- [x] 3.3 Integrate scoped range reads on the plans tab and retain other student tabs; verify missing-schema/error/retry states do not hide existing plans or fabricate empty results, and status updates refresh range percentages.

## 4. Local verification and handoff

- [x] 4.1 Run focused tests, format:check, lint, typecheck, full tests and build; record exact commands, counts, existing failures and unexecuted acceptance rather than claiming full success.
- [ ] 4.2 Verify create/edit/cancel, range percentages, two-student isolation, version review and persistence after reload in an approved isolated environment; record real-JWT owner/teacher/student/contact/Platform Owner/anonymous allow-and-deny results separately from fixture tests.
- [x] 4.3 Update curriculum/student code maps, UI/action flow, Supabase handoff and feature verification guide; deliver migration/preflight SQL paths, deployment order and non-destructive rollback instructions, with no automatic shared-database changes.

Local implementation note: 2.3 locking/revision/atomic save is implemented and isolated PostgreSQL verifies stale/invalid rollback and replacement retention; independent-session concurrency races remain unverified, so its checkbox is intentionally pending. Task 2.4 JWT scope checks use stub client/helper fixtures; real JWT/persona verification remains task 4.2. Task 4.4 requires user-applied migration and explicit environment acceptance; no shared database was changed automatically.
- [ ] 4.4 Perform approved Preview/Production acceptance after user-applied migration; verify actual deployment scope and persistence and leave this task pending if that environment or authorization is unavailable.
