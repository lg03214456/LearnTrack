## Purpose

Defines a testable authorization boundary for organization roles and class-scoped data so the mock dashboard behaves safely before production identity and database enforcement are introduced.

## ADDED Requirements

### Requirement: Organization-scoped identity
The system SHALL resolve the active account, organization membership, role, account status, and assigned classes on the server, and MUST NOT treat client-supplied role or organization values as proof of access.

#### Scenario: Active organization member
- **WHEN** an active mock account opens the dashboard
- **THEN** the server resolves one organization membership and its effective role and class scope

#### Scenario: Inactive account
- **WHEN** an inactive account attempts to access a protected dashboard route
- **THEN** the system denies access without returning organization data

### Requirement: Central permission catalog
The system SHALL evaluate access through stable permission codes grouped by student, class, attendance, progress, analytics, account, and role administration modules.

#### Scenario: Allowed permission
- **WHEN** a member's effective role grants the permission required by an operation
- **THEN** the authorization result permits the operation subject to its data scope

#### Scenario: Missing permission
- **WHEN** a member's effective role does not grant the required permission
- **THEN** the authorization result denies the operation even if its UI control is manually invoked

### Requirement: Class-scoped access
The system SHALL support organization-wide and assigned-class data scopes, and SHALL restrict teacher and assistant access to students and records connected to their assigned classes.

#### Scenario: Assigned class request
- **WHEN** a class-scoped member requests a class assigned to that member
- **THEN** the system returns only records connected to the requested class and organization

#### Scenario: Unassigned class request
- **WHEN** a class-scoped member requests a class that is not assigned to that member
- **THEN** the system returns an unavailable result without revealing whether the class exists

#### Scenario: Organization roster deduplication
- **WHEN** an organization-wide member views students enrolled in multiple classes
- **THEN** each student appears once while retaining every visible class membership

### Requirement: Server-enforced route and operation protection
The system SHALL enforce authorization in server page loaders and server-side operation boundaries in addition to adapting navigation and controls.

#### Scenario: Direct protected URL
- **WHEN** a member directly enters a route for which the member lacks permission
- **THEN** the server renders an access-denied state and does not load protected view data

#### Scenario: Unauthorized mutation request
- **WHEN** a member invokes a protected operation without its required permission
- **THEN** the server rejects the operation and leaves stored data unchanged

### Requirement: Permission-aware navigation and controls
The system SHALL expose only navigation destinations and action controls supported by the server-derived capability view for the active member.

#### Scenario: Teacher navigation
- **WHEN** a teacher lacks account and role administration permissions
- **THEN** account-management and role-permission navigation are absent

#### Scenario: Read-only operation
- **WHEN** a member can read a feature but cannot modify it
- **THEN** the feature remains visible while its mutation controls are absent or disabled with an accessible explanation

### Requirement: Mock persona selection
The development build SHALL provide an explicit mock-persona selector for exercising owner, administrator, teacher, assistant, inactive, and limited-permission states, and SHALL identify the experience as non-production authentication.

#### Scenario: Persona switch
- **WHEN** a developer changes the active mock persona
- **THEN** the next server-rendered view reflects that persona's role, navigation, permissions, and class scope

### Requirement: Production adapter boundary
The identity and authorization contracts SHALL be independent of mock fixtures so a production authentication provider, relational permission store, and database policies can replace mock adapters without changing permission codes or feature view contracts.

#### Scenario: Authorization contract test
- **WHEN** mock and future production adapters return the same authorization context
- **THEN** protected features produce equivalent allow, deny, and scoped-data behavior

