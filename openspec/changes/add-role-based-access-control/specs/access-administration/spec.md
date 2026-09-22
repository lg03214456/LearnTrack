## Purpose

Defines how authorized LearnTrack operators inspect and manage organization accounts, roles, and permission assignments while protecting system roles and avoiding accidental lockout.

## ADDED Requirements

### Requirement: Account directory
The system SHALL provide authorized account administrators an organization-scoped directory with search, role filtering, status filtering, pagination, and account summaries.

#### Scenario: Filter accounts
- **WHEN** an authorized administrator searches by name or email and selects role or status filters
- **THEN** the URL-backed result contains only matching accounts from the current organization

#### Scenario: Unauthorized directory request
- **WHEN** a member without `accounts.read` requests the account directory directly
- **THEN** the system denies access without returning account names or email addresses

### Requirement: Account lifecycle administration
The system SHALL allow members with the relevant permissions to create a mock invitation, change an account role, assign class scope, activate an account, or deactivate an account.

#### Scenario: Valid account update
- **WHEN** an authorized administrator submits a valid role, status, or class-assignment change
- **THEN** the mock repository applies the change and the directory reflects the updated effective access

#### Scenario: Prevent self-lockout
- **WHEN** the only active owner attempts to deactivate itself or remove its owner role
- **THEN** the system rejects the operation with a clear explanation

#### Scenario: Invalid cross-organization target
- **WHEN** an administrator submits an account identifier outside the active organization
- **THEN** the system rejects the operation without revealing target account details

### Requirement: Role and permission editor
The system SHALL let authorized role administrators select a role, inspect permissions grouped by module, and update permissions for editable organization roles.

#### Scenario: Save editable role permissions
- **WHEN** an authorized administrator changes permission toggles for an editable role and saves
- **THEN** the mock repository stores the new permission set and future authorization checks use it

#### Scenario: Protected system role
- **WHEN** an administrator views the owner system role
- **THEN** protected permissions are read-only and the role cannot be deleted

#### Scenario: Permission dependency
- **WHEN** a write permission depends on a related read permission
- **THEN** the editor prevents an invalid combination or automatically includes the required read permission with an explanation

### Requirement: Administrative feedback and audit-ready commands
The system SHALL validate administrative commands on the server and return accessible success or error feedback, with actor and target identifiers available to a future audit-log adapter.

#### Scenario: Successful role update
- **WHEN** a role-permission update succeeds
- **THEN** the interface confirms the saved role and the server command records actor, organization, target, and changed fields in its result boundary

#### Scenario: Concurrent or stale update
- **WHEN** an administrative update is based on stale role data
- **THEN** the system rejects or reconciles the update and prompts the administrator to reload current permissions

### Requirement: Mock-data disclosure
The account and role administration screens SHALL clearly indicate that mock account changes are for development validation and are not production authentication records.

#### Scenario: Open administration screen
- **WHEN** an authorized user opens either administration screen in the mock phase
- **THEN** a visible notice explains the temporary mock-data boundary and future Supabase migration

