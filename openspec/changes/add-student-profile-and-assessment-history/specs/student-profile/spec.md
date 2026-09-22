## Purpose

提供組織與班級權限範圍內的學生個人資料檢視與維護，讓老師能從學生名單進入單一可信的個人資訊頁。

## ADDED Requirements

### Requirement: Student profile details
The system SHALL show an authorized viewer the student's stable identifier, name, student number, school, grade, contact details, guardian contacts, enrollment status, and active class memberships.

#### Scenario: Open student from a filtered roster
- **WHEN** an authorized user opens a student from a class-filtered roster
- **THEN** the system shows that student's profile and preserves a navigation path back to the same class roster

#### Scenario: Student with multiple classes
- **WHEN** a student has active enrollment in more than one class
- **THEN** the profile lists every active class without duplicating the student

### Requirement: Profile access scope
The system MUST require student-profile read permission and enforce the active organization and assigned-class scope without revealing inaccessible student details.

#### Scenario: Assigned teacher views student
- **WHEN** a class-scoped teacher requests a student enrolled in an assigned class
- **THEN** the system returns the profile and only authorized related information

#### Scenario: Unassigned student request
- **WHEN** a class-scoped user requests a student outside all assigned classes
- **THEN** the system returns a non-disclosing unavailable result

### Requirement: Profile maintenance
The system SHALL allow an authorized manager to update editable student and guardian contact fields while preserving the student's stable identity and class enrollment relationships.

#### Scenario: Update contact information
- **WHEN** an authorized manager submits valid phone, school, grade, or guardian details
- **THEN** the system saves the changes for only that organization-owned student

#### Scenario: Read-only user
- **WHEN** a user has profile read permission without manage permission
- **THEN** edit controls are unavailable and a direct mutation request is rejected

### Requirement: Sensitive-field presentation
The system SHALL expose contact information only inside authorized student-detail views and SHALL not include it in unrelated list or aggregate View Models.

#### Scenario: Student list remains minimal
- **WHEN** the roster is requested
- **THEN** guardian contact details are omitted from the roster result

