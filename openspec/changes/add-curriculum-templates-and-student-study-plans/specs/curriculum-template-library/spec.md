## Purpose

Provides an organization-scoped, versioned source of curriculum chapters, units, materials, worksheets, and assessment placeholders that can be reused without rewriting student history.

## ADDED Requirements

### Requirement: Curriculum dimensions
The system SHALL classify every curriculum template by organization, grade, subject, and publisher or custom source, and SHALL prevent duplicate active combinations with the same template name.

#### Scenario: Create a classified template
- **WHEN** an authorized user selects a grade, subject, publisher, and unique template name
- **THEN** the system creates an organization-owned draft template

#### Scenario: Cross-organization dimension
- **WHEN** a user submits a dimension identifier outside the active organization
- **THEN** the system rejects the request without revealing the external record

### Requirement: Ordered curriculum content
The system SHALL let authorized users maintain ordered chapter, unit, material, worksheet, and assessment-placeholder items within a draft version.

#### Scenario: Reorder draft items
- **WHEN** an authorized user changes item order in a draft
- **THEN** subsequent views return the items in the saved order

#### Scenario: Invalid hierarchy
- **WHEN** an item references a parent outside the same template version
- **THEN** the system rejects the change

### Requirement: Immutable published versions
The system SHALL assign explicit versions to curriculum templates and MUST NOT mutate a published version in place.

#### Scenario: Publish a draft
- **WHEN** a valid draft with at least one content item is published
- **THEN** the version becomes available for new student study plans and is read-only

#### Scenario: Edit published content
- **WHEN** an authorized user requests changes to a published version
- **THEN** the system creates or requires a new draft version rather than changing the published record

### Requirement: Copy and archive templates
The system SHALL allow authorized users to copy an existing version into a new draft and archive templates that are no longer offered.

#### Scenario: Copy a version
- **WHEN** an authorized user copies a template version and chooses new dimensions or a new name
- **THEN** the system creates an independent draft with equivalent ordered content

#### Scenario: Archive an assigned template
- **WHEN** a template used by existing study plans is archived
- **THEN** existing plans remain readable while the template is unavailable for new assignments

### Requirement: Curriculum permissions
The system SHALL require `curriculum.read` for template views and `curriculum.manage` for create, copy, edit, publish, and archive operations.

#### Scenario: Read-only curriculum user
- **WHEN** a user has curriculum read permission but not manage permission
- **THEN** published templates are visible and mutation controls are unavailable and server-rejected

