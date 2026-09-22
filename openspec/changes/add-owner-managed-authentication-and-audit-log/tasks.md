## 1. Provider contracts and configuration

- [x] 1.1 Define server-only Auth, Email, Membership, Session, and Audit contracts plus UI-safe result types; verify browser-facing modules cannot import provider secrets or server-only implementations.
- [x] 1.2 Add explicit provider configuration parsing for Mock and production modes; verify tests reject Mock providers and missing production settings when `NODE_ENV=production`.
- [x] 1.3 Extend the internal account model with nullable stable `authUserId`, login email, account status, creator, and session metadata; verify existing profile IDs and RBAC relationships remain stable.
- [x] 1.4 Add `credentials.change_self`, `credentials.force_reset`, and `audit.read` permissions with dependency and persona-policy tests.

## 2. Development authentication and membership

- [x] 2.1 Implement resettable Mock Auth, Email, Membership, and Session adapters with non-real seeded credentials; verify unit tests cover valid login, invalid login, disabled account, logout, and session revocation.
- [x] 2.2 Replace default-Owner identity resolution with session-to-membership resolution while preserving `AuthorizationContext`; verify unauthenticated identity resolution fails instead of returning Owner.
- [x] 2.3 Restrict the persona switch to explicit development Mock mode and add a persistent Mock warning; verify production rendering contains neither the switch nor a Mock login bypass.
- [x] 2.4 Protect dashboard routes and Server Actions with authenticated session resolution; verify unauthenticated routes redirect to login and direct mutation calls fail closed.

## 3. Login and password experience

- [x] 3.1 Build the closed login page with email, password, safe failure messaging, and no registration link; verify keyboard, label, focus, invalid-credential, disabled-account, and success-redirect behavior.
- [x] 3.2 Build logout and session-expired flows; verify logout invalidates the current session and protected navigation returns to login.
- [x] 3.3 Build forgot-password request UI with an identical confirmation response for known and unknown emails; verify tests prevent account enumeration.
- [x] 3.4 Build email-link callback and new-password UI; verify valid, expired, consumed, altered, and disabled-account links produce the specified outcomes.
- [x] 3.5 Add authenticated self-password-change request from the personal profile; verify the Mock Email adapter receives a single-use account-bound link request.

## 4. Owner account administration

- [x] 4.1 Extend account management so authorized Owner actors create an account with email, initial password, role, organization-owned scope, and status; verify unauthorized, duplicate-email, invalid-role, and cross-organization requests are rejected.
- [x] 4.2 Add Owner actions for email change, resend setup, force reset, revoke sessions, disable, and restore; verify every action re-authenticates the actor, validates scope, and never returns an existing password.
- [x] 4.3 Handle partial provider/membership failures with a disabled pending account or compensation; verify an orphaned provider identity cannot resolve an active `AuthorizationContext`.
- [x] 4.4 Preserve the final active Owner protections and add session revocation on disable; verify disabling or demoting the last Owner remains impossible.

## 5. Audit model and coverage

- [x] 5.1 Define the append-only audit event model, action catalog, result codes, safe metadata allowlist, and Mock Audit repository; verify ordinary repository APIs expose no update or delete operation.
- [x] 5.2 Implement the Audit Service with organization, actor, resource, request correlation, result, and safe-diff normalization; verify tests reject password, hash, token, reset-link, and unnecessary personal-data fields.
- [x] 5.3 Audit login success/failure, logout, reset request/completion, email change, session revocation, account creation, disablement, restoration, and permission updates; verify representative success and denied-event tests.
- [x] 5.4 Add audited execution wrappers to material student, class, attendance, curriculum, progress, assessment, lifecycle, and export mutations; verify mutations do not report success when their required audit event cannot be persisted.
- [x] 5.5 Build the organization-scoped Audit Log page with time, actor, action, resource, and result filters; verify Owner access, reverse chronological ordering, pagination, and fail-closed teacher access.

## 6. Supabase and email production adapter

- [x] 6.1 Document required Supabase URL/keys, redirect URLs, sender identity, SMTP settings, and secret placement without committing secret values; verify the handoff includes local, preview, and production configuration matrices.
- [x] 6.2 Implement the production Auth and Email adapters against configured providers; verify contract tests shared with Mock adapters cover login, email links, password replacement, logout, and revocation.
- [ ] 6.3 Add normalized roles, permissions, role-permission assignments, organization memberships, membership-role assignments, optional student self-login links, neutral student-contact relationships, and append-only audit persistence with organization ownership and stable optional Auth linkage; add lifecycle constraints, a partial unique constraint for one active self-login per student, and relationship lookup indexes; verify migration tests preserve profile and student IDs, support multiple roles, preserve inactive student history, and prevent an Auth user without active membership from logging in.
- [ ] 6.4 Add PostgreSQL RLS policies for memberships, permission resolution, permission-specific relationship access, and audit reads/writes; verify tests prevent cross-organization access, allow authorized staff to query inactive students, deny student-self access when the student or self-login link is inactive, restrict contacts to linked students and teachers to assigned classes, prevent mixed roles from broadening unrelated row access, and prevent browser clients from mutating audit history.
- [ ] 6.5 Add production account-linking and cutover tooling based on explicit Owner review of verified emails, role assignments, and student self-login relationships; verify ambiguous, duplicate, disabled, missing-account, relationship-incomplete, second-active-self-link, and unlinking cases remain safe and that unlinking preserves student and audit history.

## 7. Verification and documentation

- [x] 7.1 Add integration tests for Owner provisioning through login, self password change, forgot password, forced reset, email change, disablement, session revocation, and audit review.
- [x] 7.2 Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; verify all commands pass and record any provider-dependent test prerequisites.
- [x] 7.3 Perform browser checks for login, password, Owner account, Mock banner, protected redirects, and Audit Log across Owner, director, teacher, disabled, and unauthenticated states; verify no protected data flashes before denial.
- [x] 7.4 Update the authentication/audit codemap, system architecture, UI-to-action flow, Supabase handoff, and user operation manual; verify documentation distinguishes Mock testing from production security and lists the future binding inputs.
