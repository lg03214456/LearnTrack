## Purpose

Provide a separately governed platform identity that can inspect every LearnTrack organization without weakening organization membership isolation or receiving implicit tenant write access.

## ADDED Requirements

### Requirement: Platform identity is independent of organization membership
The system SHALL resolve an active Platform Owner from an explicit platform-operator assignment and SHALL NOT require or synthesize an organization membership for that identity.

#### Scenario: Active Platform Owner signs in
- **WHEN** an authenticated profile has an active Platform Owner assignment and no organization membership
- **THEN** the system creates a platform authorization context and admits the user to the platform workspace

#### Scenario: Inactive platform assignment
- **WHEN** an authenticated profile has an inactive, suspended, or revoked platform assignment and no active organization membership
- **THEN** the system denies access without falling back to tenant Owner access

### Requirement: Platform and organization permissions remain separate
The system MUST use distinct permission catalogs and authorization contexts for platform and organization actors, and it MUST NOT treat Platform Owner status as an organization role assignment.

#### Scenario: Organization Owner lacks platform access
- **WHEN** an organization Owner has every organization permission but no active platform assignment
- **THEN** the system denies access to platform-only routes and cross-organization queries

#### Scenario: Platform Owner has no implicit tenant write permission
- **WHEN** a Platform Owner with read permissions attempts to create, update, archive, or delete organization business data
- **THEN** the system denies the mutation

### Requirement: Platform Owner can inspect explicit organizations
An active Platform Owner with `platform.tenant_data.read` SHALL be able to read business data from any active organization only when the request identifies an explicit target organization.

#### Scenario: Inspect first organization
- **WHEN** a Platform Owner selects organization A
- **THEN** the system returns organization A data and labels the active inspection context as organization A

#### Scenario: Inspect second organization
- **WHEN** the same Platform Owner selects organization B
- **THEN** the system returns organization B data without retaining organization A data in the result

#### Scenario: Missing target organization
- **WHEN** a platform business-data request omits the target organization
- **THEN** the system fails closed instead of interpreting the omission as all organizations

### Requirement: Tenant actors remain organization isolated
Organization actors SHALL access only records whose `organization_id` matches their active organization membership, subject to their permission and relationship scope.

#### Scenario: Organization A Owner targets organization B
- **WHEN** an Owner in organization A requests a record owned by organization B
- **THEN** the server and database deny or conceal the record

#### Scenario: Forged organization identifier
- **WHEN** an organization actor changes a URL, form field, or request payload to another organization identifier
- **THEN** the system derives authorization from the authenticated membership and denies the cross-organization operation

### Requirement: Cross-organization platform reads are audited
The system MUST append a platform audit event for Platform Owner access to tenant business data, identifying the actor, target organization, action, result, request correlation, and safe metadata without storing credentials or full sensitive payloads.

#### Scenario: Successful platform inspection
- **WHEN** a Platform Owner opens organization A business data
- **THEN** the system records a successful platform audit event targeting organization A

#### Scenario: Denied platform mutation
- **WHEN** a read-only Platform Owner attempts a tenant mutation
- **THEN** the system rejects the mutation and records a denied platform audit event

### Requirement: Platform authorization is protected at the database boundary
Platform authorization tables and platform audit records SHALL have RLS enabled, SHALL reject anonymous access, and SHALL prevent ordinary authenticated users from granting themselves platform access.

#### Scenario: Tenant user attempts self-promotion
- **WHEN** a normal authenticated organization user attempts to create or modify a platform-operator assignment
- **THEN** the database denies the operation

#### Scenario: Platform read policy
- **WHEN** an active Platform Owner with the required platform permission queries tenant rows through an authenticated request
- **THEN** RLS permits the read across organizations while continuing to deny writes without an explicit platform write permission

