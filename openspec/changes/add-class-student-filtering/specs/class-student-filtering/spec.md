## Purpose

Let users move directly from a class to the shared student roster with that class visibly and consistently selected, while preserving organization-wide roster access and trustworthy metrics.

## ADDED Requirements

### Requirement: Navigate from a class to its students
Each class displayed in the class overview SHALL provide an explicit action that opens the shared student roster with that class selected by a stable class identifier in the URL.

#### Scenario: Open a class roster
- **WHEN** a user activates "查看學生名單" for a class
- **THEN** the system SHALL navigate to `/students` with that class identifier represented in the query string
- **AND** the roster SHALL contain only students enrolled in that class

### Requirement: Show selected class context
The student roster SHALL make an active class filter visible in the page context and filter controls.

#### Scenario: Load a URL containing a valid class filter
- **WHEN** a user opens `/students?classId=<valid-class-id>`
- **THEN** the roster SHALL show the selected class name, select that class in the class filter, and display the filtered result count

#### Scenario: Reload a filtered roster
- **WHEN** a user reloads or shares a roster URL containing a valid class identifier
- **THEN** the same class filter SHALL be restored from the URL

### Requirement: Combine roster filters
Class, search, and student-status filters SHALL be combinable, and visible rows SHALL satisfy every active filter.

#### Scenario: Search within a class
- **WHEN** a class is selected and the user searches by student name or student number
- **THEN** the roster SHALL show only matching students enrolled in that class

#### Scenario: Filter student status within a class
- **WHEN** a class is selected and the user chooses a student status
- **THEN** the roster SHALL show only students in that class with the selected status

### Requirement: Clear or change class filter
The roster SHALL allow users to switch the selected class or clear it through the class selector's empty "全部班級" option without a separate clear-filter button.

#### Scenario: Clear selected class
- **WHEN** a user clears the active class filter
- **THEN** the class identifier SHALL be removed from the URL
- **AND** the roster SHALL return to organization-wide student results

#### Scenario: Select another class
- **WHEN** a user selects a different class from the roster filter
- **THEN** the URL and roster results SHALL update to the newly selected class

### Requirement: Filters update inline without supplemental feedback
The roster SHALL update from search input and select changes without a search submit button, dedicated clear-filter control, toast, modal, or floating notification. Class and status selectors SHALL each expose an empty-value "全部" option.

#### Scenario: Type into student search
- **WHEN** the user changes the search text
- **THEN** the URL-backed roster SHALL update after a short debounce while preserving supported class and status filters

#### Scenario: Select an all option
- **WHEN** the user selects the empty "全部" option for class or status
- **THEN** that filter SHALL be removed from the URL and the table SHALL update inline

### Requirement: Support multiple class memberships
Student membership SHALL be determined through enrollment relationships, and one student MUST be eligible to appear in every class in which they have an active enrollment.

#### Scenario: Student belongs to multiple classes
- **WHEN** a student has active enrollments in two classes
- **THEN** the student SHALL appear when either corresponding class filter is selected
- **AND** the organization-wide roster SHALL not duplicate that student as separate people

### Requirement: Keep summaries consistent with context
Roster summaries, row counts, and displayed results SHALL be derived from the same authoritative organization-scoped relationships and SHALL clearly identify whether they describe the whole organization or the selected class.

#### Scenario: View organization roster
- **WHEN** no class filter is active
- **THEN** summary metrics SHALL describe the organization-wide student population

#### Scenario: View class roster
- **WHEN** a valid class filter is active
- **THEN** summary metrics SHALL describe the selected class and reconcile with its enrollment data

### Requirement: Handle unavailable class identifiers safely
An invalid, missing, or inaccessible class identifier SHALL NOT expose class details or silently present organization-wide results as if they were filtered.

#### Scenario: Open an unavailable class filter
- **WHEN** the URL contains a class identifier that cannot be resolved for the current organization and user
- **THEN** the system SHALL show a neutral unavailable-filter message with an action to return to the organization roster
- **AND** it SHALL NOT reveal whether the class exists in another organization

### Requirement: Preserve responsive and accessible operation
Class roster navigation and filter controls SHALL remain keyboard-operable, labelled, and usable without whole-page horizontal overflow on narrow viewports.

#### Scenario: Use class filtering on mobile
- **WHEN** a user opens or changes a class filter on a narrow viewport
- **THEN** the selected-class context, filters, and roster SHALL remain operable without horizontal scrolling of the entire page
