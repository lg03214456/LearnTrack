## Context

See `proposal.md` for motivation and `specs/class-student-filtering/spec.md` for observable behavior. The current `/classes` and `/students` routes use separate client views, the roster filters only by search and status, and mock rows flatten membership into one `className`. Summary values are partly hard-coded and do not reconcile with fixtures.

The implementation must follow `docs/engineering-standards.md`: server pages obtain data through repository contracts, URL state represents shareable navigation, Client Components do not import fixtures, and metrics come from the authoritative repository result.

## Goals / Non-Goals

**Goals:**

- Reuse `/students` as the only roster surface for organization and class contexts.
- Make `classId` in the URL the source of truth for the selected class.
- Represent class membership through normalized enrollment fixtures.
- Return rows, selected-class context, filter options, pagination metadata, and summaries as one consistent repository result.
- Keep the design compatible with a future Supabase JOIN implementation.

**Non-Goals:**

- Building a full `/classes/[classId]` detail page with attendance, progress, and assessment tabs.
- Connecting Supabase or implementing production RLS in this change.
- Adding student create/edit/archive workflows.
- Implementing server-side pagination beyond defining a compatible query/result boundary for the current mock dataset.

## Decisions

### Use `/students?classId=<id>` instead of a second roster route

The class-card action will be a real link to the shared roster. `/students` remains the organization roster; a `classId` query parameter selects a class. This avoids two roster implementations and makes reload, bookmarking, sharing, and browser navigation deterministic.

A separate `/classes/[classId]/students` route was considered but rejected for this stage because its UI and filtering behavior would duplicate `/students`. A future class detail route may link to the same query-backed roster.

### Treat URL search parameters as filter state

The server page will parse `classId`, search, status, and page parameters and pass a query object to the repository. Filter changes will update the URL rather than existing only in component state. Debounced search uses URL replacement while explicit class and status selections use push navigation history. Selects expose empty "全部" options; no separate clear or search-submit controls are rendered, and filter navigation does not emit toast or floating feedback.

The implementation must preserve unrelated supported filter parameters when one filter changes and reset the page number when a filter changes.

### Return one page-oriented repository result

The student repository boundary will accept a `ListStudentsQuery` and return a `StudentListResult` containing:

- unique student rows with an array of class memberships;
- selected class context when valid;
- available class filter options;
- organization-level or class-level summary metrics;
- total filtered row count and pagination metadata;
- a neutral unavailable-class outcome.

This keeps UI components independent of fixtures and future Supabase row shapes. The current all-purpose dashboard repository may be split during implementation when doing so cleanly separates the student roster responsibility.

### Normalize mock membership through enrollments

Class membership will use stable `studentId` and `classId` enrollment records. The roster maps enrollments to View Models and deduplicates students in organization-wide results. Class counts and class-specific summaries derive from active enrollments rather than unrelated card constants.

### Distinguish organization and class summaries

Without `classId`, summary cards describe organization students. With a valid `classId`, cards describe the selected class and use class-specific labels. The page will not mix organization totals with class-filtered rows unless a metric is explicitly labelled as organization-wide.

### Fail closed for unavailable classes

An unresolved class filter returns a neutral unavailable-filter state and a link to `/students`. It does not fall back silently to all students and uses the same message for invalid and unauthorized identifiers, preserving the future RLS security boundary.

## Risks / Trade-offs

- [URL updates can make search feel slow] → Debounce text input and use URL replacement for search changes while keeping immediately responsive input state.
- [One student can belong to multiple classes] → Keep unique student rows and render membership badges rather than duplicating people in organization results.
- [Existing display counts will change] → Derive card and roster totals from fixtures and update tests to assert reconciliation rather than preserving illustrative constants.
- [Mock filtering may hide future database performance issues] → Shape the repository query for server-side filtering and pagination so the Supabase implementation can use indexed JOINs later.
- [Unavailable class behavior can be confused with an empty class] → Use separate states: an available class with zero enrollments shows an empty roster; an unavailable class shows a neutral filter error.

## Migration Plan

1. Add typed student-list query/result View Models and normalized enrollment fixtures.
2. Implement repository filtering, deduplication, summaries, and unavailable-class behavior.
3. Update the student server page to parse URL parameters and request the page result.
4. Update the roster view to render selected-class context, URL-backed filters, summaries, empty states, and multiple class memberships.
5. Add class-card links to the filtered roster.
6. Add repository, component, navigation, accessibility, and responsive tests.
7. Update Code Map and UI/backend action-flow documentation.

Rollback is removing the class-card links and query behavior while retaining the normalized enrollment fixtures, which are compatible with the organization-wide roster.
