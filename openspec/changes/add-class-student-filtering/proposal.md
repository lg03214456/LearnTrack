## Why

The current class cards and student roster represent related data but do not provide a navigable relationship between them, so users cannot move from a class to only that class's students. The roster metrics are also disconnected from the visible mock records, making organization totals and class totals ambiguous.

## What Changes

- Add an explicit "查看學生名單" action to every class card.
- Navigate that action to the existing student roster with a stable class query parameter, for example `/students?classId=cls-1`.
- Initialize the roster's class filter from the URL and display the selected class as visible page context.
- Allow users to switch classes or select the built-in "全部" option to return to the organization-wide roster, without a separate clear-filter control.
- Preserve search and status filtering while a class filter is active.
- Update search and select filters as the user interacts, without submit buttons, toasts, or floating notices.
- Derive roster rows, result counts, and summary metrics from the same organization-scoped mock relationships instead of unrelated display constants.
- Model student-to-class membership through enrollments so one student can belong to multiple classes.
- Define behavior for missing, invalid, or inaccessible class identifiers without exposing unauthorized class information.

## Capabilities

### New Capabilities

- `class-student-filtering`: Navigation from a class to the shared student roster, URL-backed class filtering, selected-class context, and consistent organization/class summary behavior.

### Modified Capabilities

None. The earlier dashboard capability has not yet been archived into the main spec store, so this change records the behavior as a new independently reviewable capability.

## Impact

- Affects the class cards, student roster route, filter state, summary metrics, mock enrollment fixtures, repository query contract, tests, and Code Map/action-flow documentation.
- Introduces no new deployment service or production database dependency.
- Keeps `/students` as the organization-wide roster and adds backward-compatible query-parameter behavior.
