## 1. Authorization Data Boundary

- [x] 1.1 Define client-safe permission codes, account/role administration view models, authorization context, data-scope, query, command, and result types; verify strict TypeScript checking passes and Client Components do not import server modules
- [x] 1.2 Normalize mock profiles, organization memberships, roles, role permissions, account statuses, and class assignments for owner, administrator, teacher, assistant, inactive, and limited personas; verify relationship tests resolve every organization, profile, role, permission, and class foreign key
- [x] 1.3 Create the centralized permission catalog with module labels and read/write dependencies; verify catalog tests reject duplicate codes and invalid dependency graphs
- [x] 1.4 Add resettable mock identity and access repositories behind server-only contracts; verify repository contract tests cover organization isolation, protected system roles, and deterministic test resets

## 2. Identity and Authorization Policy

- [x] 2.1 Implement the server-only mock `IdentityProvider` and development persona selector without accepting authoritative role or organization data from the client; verify active, inactive, missing, and switched-persona tests
- [x] 2.2 Implement permission and class-scope authorization policies with fail-closed unavailable results; verify unit tests cover organization-wide, assigned-class, missing-permission, unassigned-class, and cross-organization requests
- [x] 2.3 Add reusable server route/operation authorization helpers and an accessible denied-state component; verify direct protected-route and direct unauthorized-command tests load no protected data and perform no mutation
- [x] 2.4 Pass resolved access scope into student, class, progress, attendance, and analytics repository queries; verify teachers and assistants receive only assigned-class data while organization-wide users retain deduplicated organization results

## 3. Permission-aware Dashboard

- [x] 3.1 Refactor dashboard navigation into declarative permission-gated items and add account/role settings destinations; verify owner/admin and teacher/assistant navigation snapshots expose only permitted links
- [x] 3.2 Add a clearly labeled development-only persona selector and current-role summary to the shell; verify switching personas refreshes server-rendered navigation, routes, controls, and class scope
- [x] 3.3 Apply server authorization to every existing dashboard page and permission-aware behavior to mutation controls; verify read-only personas can view allowed features but cannot invoke disallowed operations
- [x] 3.4 Reverify class-to-student navigation under class scope; verify assigned classes open normally and missing, cross-organization, and unassigned classes share the same non-disclosing unavailable state

## 4. Account Administration

- [x] 4.1 Implement an organization-scoped account administration repository query with URL-backed search, role, status, and pagination filters plus reconciled summaries; verify contract tests cover combined filters and organization isolation
- [x] 4.2 Build `/settings/accounts` with responsive summary, filters, account table, mock-data notice, empty, loading, denied, and unavailable states; verify desktop/mobile component tests and accessible labels
- [x] 4.3 Implement validated mock commands for invitation, role change, class assignment, activation, and deactivation through a service boundary; verify authorized success, stale input, unauthorized, cross-organization, and last-owner protection tests
- [x] 4.4 Connect account actions to accessible success/error feedback and refresh effective access after changes; verify browser tests cover a role/status update and confirm denied operations leave data unchanged

## 5. Role and Permission Administration

- [x] 5.1 Implement role detail and grouped-permission repository queries that mark system roles and permission dependencies; verify view-model tests reconcile granted counts and protected states
- [x] 5.2 Build `/settings/roles` with responsive role selection, grouped permission toggles, protected-role states, mock-data notice, save feedback, and denied state; verify keyboard and desktop/mobile component tests
- [x] 5.3 Implement a validated role-permission update service with optimistic version checking and audit-ready result metadata; verify tests cover valid updates, stale updates, missing permission, protected owner permissions, and permission dependencies
- [x] 5.4 Verify an editable role permission change affects subsequent server authorization and navigation for assigned accounts without restarting the application

## 6. Documentation and Quality

- [x] 6.1 Update system architecture, codemap, UI/backend actions, and Supabase handoff documentation with identity, RBAC, class scope, future tables, Auth mapping, RLS defense-in-depth, and mock security limitations; verify all documented paths and permission codes match implementation
- [x] 6.2 Run relationship, policy, repository, service, component, direct-route, and browser tests across all personas at desktop and mobile widths, including absence of whole-page horizontal overflow
- [x] 6.3 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; report warnings separately from failures and note that production use remains blocked until real authentication, persistent authorization storage, and RLS are implemented
