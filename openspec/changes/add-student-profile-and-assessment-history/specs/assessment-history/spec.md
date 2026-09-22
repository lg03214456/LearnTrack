## Purpose

提供可追溯且權限受控的學生考試成績登錄與歷史查閱，並從同一份成績紀錄推導摘要與趨勢。

## ADDED Requirements

### Requirement: Assessment result records
The system SHALL store each result against an organization-owned assessment and student with subject, assessment name, assessment date, score, maximum score, and optional teacher comment.

#### Scenario: Record a valid result
- **WHEN** an authorized teacher submits a score within zero and the assessment maximum
- **THEN** the system creates one traceable result for the selected student and assessment

#### Scenario: Invalid score
- **WHEN** a score is negative, exceeds the maximum, or uses an unavailable assessment
- **THEN** the system rejects the command without changing existing results

### Requirement: Result correction
The system SHALL allow an authorized teacher to correct a result while retaining stable result identity and update metadata.

#### Scenario: Correct an entered score
- **WHEN** an authorized teacher changes the score or comment of an accessible result
- **THEN** subsequent history and summaries use the corrected value

#### Scenario: Cross-scope correction
- **WHEN** a user attempts to modify a result for an inaccessible student or another organization
- **THEN** the system returns a non-disclosing unavailable result

### Requirement: Assessment history views
The system SHALL show assessment history ordered by assessment date and allow filtering by academic term and subject.

#### Scenario: Filter by subject
- **WHEN** a viewer selects a subject
- **THEN** the history shows only results for that subject while preserving the selected student

#### Scenario: No matching results
- **WHEN** no results match the selected filters
- **THEN** the system shows an empty state distinct from an unavailable student

### Requirement: Derived assessment summaries
The system SHALL derive latest score, normalized percentage, average percentage, result count, and trend points from authorized result records rather than independent display constants.

#### Scenario: Different maximum scores
- **WHEN** history contains assessments with different maximum scores
- **THEN** averages and trend comparisons use normalized percentages

#### Scenario: Result correction updates summary
- **WHEN** an existing score is corrected
- **THEN** all affected summary and trend values are recalculated from the result collection

### Requirement: Assessment permissions
The system MUST require assessment-history read permission to view results and manage permission to create or correct them, together with organization and assigned-class student scope.

#### Scenario: Read-only assessment viewer
- **WHEN** a user has result read permission without manage permission
- **THEN** history is visible but result entry and correction controls are unavailable and server-rejected

