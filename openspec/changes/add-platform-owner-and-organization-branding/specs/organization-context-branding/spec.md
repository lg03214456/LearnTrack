## Purpose

Make the current tenant context unmistakable by resolving the authoritative organization name on the server and displaying it consistently in authenticated navigation and landing experiences.

## ADDED Requirements

### Requirement: Organization users see their organization name
The authenticated application shell and landing experience SHALL display the name of the organization resolved from the user's active membership instead of a fixed tenant name or a browser-supplied value.

#### Scenario: Organization Owner signs in
- **WHEN** an organization Owner for organization A signs in
- **THEN** the shell and landing experience display organization A's current name

#### Scenario: Organization name changes
- **WHEN** organization A is renamed and the user starts a newly resolved request or session
- **THEN** the shell displays the updated organization name without changing authorization identifiers

### Requirement: Platform context is clearly distinguished
The platform workspace SHALL display `LearnTrack 平台管理` when no organization is selected and SHALL display both the selected organization name and a platform inspection indicator while a Platform Owner inspects tenant data.

#### Scenario: Platform home without selection
- **WHEN** a Platform Owner enters the platform workspace without selecting an organization
- **THEN** the shell displays `LearnTrack 平台管理` and does not present tenant business data

#### Scenario: Platform Owner selects an organization
- **WHEN** a Platform Owner selects organization B
- **THEN** the shell displays organization B's name together with a clear platform inspection indicator

### Requirement: Organization name is authoritative and safely rendered
The organization name MUST be loaded from trusted server-side organization data after authorization and MUST NOT be accepted from URL text, local storage, unsigned cookies, or request payloads as authoritative branding.

#### Scenario: Forged organization label
- **WHEN** a user supplies a different organization name through a URL or request payload
- **THEN** the system ignores that label and renders the name associated with the authorized organization record

#### Scenario: Organization cannot be resolved
- **WHEN** the target organization is missing, inactive, or unauthorized
- **THEN** the system denies the tenant context and does not display cached data from a previously selected organization

