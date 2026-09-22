## Purpose

Provide teachers and tuition-center administrators with a coherent workspace for monitoring students, classes, attendance, progress, and learning outcomes.

## ADDED Requirements

### Requirement: Consistent administration shell
The system SHALL provide a responsive administration shell with product identity, primary navigation, current-user context, page heading, and page-level actions across all management views.

#### Scenario: Navigate between management views
- **WHEN** a user selects students, progress, classes, attendance, or analytics from primary navigation
- **THEN** the corresponding view SHALL appear while retaining the same administration shell and active-navigation indication

#### Scenario: Use a narrow viewport
- **WHEN** the application is displayed below desktop width
- **THEN** navigation and content SHALL remain operable without requiring horizontal scrolling of the entire page

### Requirement: Student roster overview
The system SHALL display student totals and a searchable, filterable roster containing identity, student number, class, contact, and status information.

#### Scenario: Filter the student roster
- **WHEN** a user enters a name or student number and chooses an available class or status filter
- **THEN** the roster and visible result count SHALL reflect records matching all active criteria

#### Scenario: No students match
- **WHEN** no student satisfies the active filters
- **THEN** the system SHALL display a clear empty result with a way to reset the filters

### Requirement: Student progress overview
The system SHALL summarize average progress, completion, pending work, and at-risk students and SHALL show per-student course, progress, lesson completion, score, status, and recent activity.

#### Scenario: Review student progress
- **WHEN** the progress view loads successfully
- **THEN** the user SHALL see summary metrics and a student table with human-readable progress indicators and risk statuses

### Requirement: Class overview
The system SHALL display classes as cards containing subject, code, teacher, schedule, student count, progress, and operational status.

#### Scenario: Filter available classes
- **WHEN** a user searches or filters by grade or subject
- **THEN** only classes matching the active criteria SHALL remain visible

### Requirement: Attendance management view
The system SHALL provide date and class selectors, attendance totals, and per-student controls for present, late, absent, and leave statuses, including optional notes.

#### Scenario: Change a mock attendance status
- **WHEN** a user selects a different attendance status for a student
- **THEN** the row state and attendance totals SHALL update immediately for the current mock session

### Requirement: Learning analytics overview
The system SHALL display aggregate score, completion, participation, and at-risk metrics together with trend and score-distribution visualizations and per-class performance.

#### Scenario: Review analytics
- **WHEN** the analytics view loads successfully
- **THEN** metric cards, chart data, score bands, and class performance SHALL use mutually consistent values from the same data source

### Requirement: Standard view states
Each management view SHALL expose a discernible loading state, populated state, and empty state without displaying raw runtime errors to the user.

#### Scenario: Data is loading
- **WHEN** a management view is waiting for its data source
- **THEN** the view SHALL show a layout-preserving loading treatment

