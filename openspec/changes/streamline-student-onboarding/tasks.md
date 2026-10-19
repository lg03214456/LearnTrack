## 1. Workflow and action boundaries

- [x] 1.1 Define setup contracts and explicit step/saved-result transitions; verify unit tests for create-once, back navigation, defer, finish, add-another and uncertain save outcomes.
- [x] 1.2 Add permission-scoped setup reads through repositories/typed actions, including basic/class data and lazy material/range options; verify tenant/student denial, no inaccessible-as-empty status and no unnecessary full workspace reads on unrelated tabs.
- [x] 1.3 Add a non-redirecting typed plan setup action sharing the existing service, Audit and invalidation behavior; verify success/conflict/permission/Audit failures and regression tests for the existing redirecting action.

## 2. Continuous student setup

- [x] 2.1 Compose the basic-information/class form into a three-step responsive modal and retain automatic student numbering; verify successful student save advances without navigation, failure keeps input, and no later write occurs without a confirmed student identity.
- [x] 2.2 Add material assignment with existing replacement confirmation, authoritative refresh and defer paths; verify published-only choices, multiple assignments under current constraints and unchanged completed-history retention.
- [x] 2.3 Extract and reuse the personal exam-range form without nested dialogs, using only refreshed assigned content; verify selection, percentages, saving, cancellation, missing-schema state and scope checks remain compatible.
- [x] 2.4 Add per-step save/defer/back/finish controls and completion summary/profile/add-another actions; verify prior commits survive later cancellation/failure, revisits update rather than recreate, reset clears all previous student data and uncertain results do not trigger automatic retries.
- [x] 2.5 Apply accessible focus management, pending protection, keyboard dismissal and async context guards; verify narrow-screen containment, duplicate-submit prevention, focus return and no stale response leakage after student/org/session changes.

## 3. Student profile maintenance

- [x] 3.1 Add compact basic/class edit and setup continuation entries near student identity with truthful class/material/range statuses; verify permission gating, preloaded existing records, unavailable states and no unintended class removal for limited actors.
- [x] 3.2 Present range progress first, current plans next and non-active plans in an initially collapsed labeled history area; verify history remains readable/readonly and existing plan/range percentages and original assessment/session links are unchanged.

## 4. Verification and handoff

- [x] 4.1 Run focused tests, format:check, lint, typecheck, full tests and build; record exact commands, pass counts, pre-existing failures and unexecuted checks in a feature verification note.
- [ ] 4.2 Verify the whole create → class → material → range → profile journey and existing-student resume in an approved isolated environment, including reload persistence and tenant/permission rejection; record browser proof without sensitive student data and keep live-data writes pending without scoped authorization.
- [x] 4.3 Update affected student/curriculum code maps, UI/action documentation and user test steps; verify links and explicitly document existing schema prerequisites, unchanged environment variables, incremental-save semantics and non-destructive UI rollback.

Local implementation verification is recorded in `frontend/docs/student-setup-verification.md`. Real shared-database writes, reload persistence and JWT/RLS acceptance are not claimed; task 4.2 remains pending scoped authorization.
