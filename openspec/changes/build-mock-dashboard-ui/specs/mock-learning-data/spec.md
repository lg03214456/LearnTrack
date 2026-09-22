## Purpose

Supply deterministic development data through stable domain contracts so the initial interface can be validated and later moved to Supabase without rewriting presentation components.

## ADDED Requirements

### Requirement: Centralized typed mock records
The system SHALL provide a single authoritative mock source for organizations, users, teachers, students, classes, enrollments, attendance, assessments, progress, and dashboard summaries.

#### Scenario: Render multiple views
- **WHEN** two views use the same student, class, or teacher
- **THEN** they SHALL present consistent identity and relationship values derived from the centralized mock source

### Requirement: Repository-shaped data access
Presentation code SHALL request domain data through asynchronous data-access contracts rather than importing raw fixture collections directly.

#### Scenario: Read mock records
- **WHEN** a view requests its required records
- **THEN** the mock implementation SHALL return a promise with the same domain result shape expected from a future remote implementation

### Requirement: Relationally valid fixtures
Every foreign-key-like identifier in mock records SHALL reference an existing related record, and computed dashboard totals SHALL reconcile with the underlying records.

#### Scenario: Validate fixture relationships
- **WHEN** mock data integrity is checked
- **THEN** all student enrollments, class teachers, attendance records, assessments, and progress records SHALL resolve to existing parent records

### Requirement: Future organization isolation contract
Every tenant-owned domain record SHALL include an organization identifier suitable for future database row-level isolation.

#### Scenario: Query organization data
- **WHEN** a repository query is scoped to one organization
- **THEN** it SHALL return no tenant-owned records associated with another organization

### Requirement: Supabase replacement boundary
The mock implementation SHALL be replaceable by a server-side Supabase implementation without changing page component input contracts.

#### Scenario: Select a data implementation
- **WHEN** the application is configured for mock or Supabase-backed operation
- **THEN** views SHALL consume the selected repository through the same exported contract

