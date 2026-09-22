## 1. Application Foundation

- [x] 1.1 Initialize a TypeScript Next.js App Router application in `frontend/` with lint, Tailwind, and path aliases, and verify dependency installation plus the default production build succeed
- [x] 1.2 Add the selected icon, chart, utility, and test dependencies with minimal configuration, and verify the package manifest contains no unused template packages
- [x] 1.3 Establish global design tokens, typography, responsive breakpoints, and base styles matching the supplied references, and verify a component showcase renders the intended colors and spacing

## 2. Domain Data and Repository Boundary

- [x] 2.1 Define typed domain entities and page view models for organizations, profiles, teachers, students, classes, enrollments, attendance, assessments, results, and progress, and verify TypeScript strict checking passes
- [x] 2.2 Create centralized deterministic fixtures with stable IDs and organization ownership, and verify every relationship resolves through an automated integrity test
- [x] 2.3 Define asynchronous dashboard repository contracts and a mock implementation for all five views, and verify repository tests cover organization scoping and reconciled summary totals
- [x] 2.4 Add a server-only repository composition entry point that defaults to mock data, and verify page code can consume it without importing raw fixtures

## 3. Shared Administration UI

- [x] 3.1 Build reusable button, card, badge, input, select, progress, metric, table, empty-state, and skeleton primitives, and verify representative variants render in the application
- [x] 3.2 Build the responsive administration shell with desktop sidebar, mobile navigation, page header, active route, user context, and help card, and verify navigation works at desktop and mobile widths
- [x] 3.3 Add loading and error boundaries for management routes, and verify navigation shows layout-preserving loading feedback without raw error output

## 4. Management Views

- [x] 4.1 Implement the student progress route with summary cards, tabs, filters, progress table, pagination, and empty results, and verify filtering updates the visible count and rows
- [x] 4.2 Implement the student roster route with totals, search, class/status filters, table, badges, pagination, and empty results, and verify combined filters behave correctly
- [x] 4.3 Implement the classes route with search, grade/subject filters, status cards, and progress indicators, and verify only matching class cards remain visible
- [x] 4.4 Implement the attendance route with date/class controls, totals, per-student status selection, notes, and pagination, and verify mock status changes update summary totals immediately
- [x] 4.5 Implement the analytics route with reconciled metrics, trend chart, score distribution, and class performance table, and verify chart labels and summary values come from repository results

## 5. Quality and Database Handoff

- [x] 5.1 Add focused interaction and accessibility tests for navigation, filters, empty states, attendance changes, and semantic labels, and verify the automated test suite passes
- [x] 5.2 Run lint, strict type checking, tests, and a production build; resolve all failures and record the successful commands in the project README
- [x] 5.3 Visually verify all five routes at desktop and mobile sizes against the references, and correct overflow, contrast, hierarchy, and responsive defects
- [x] 5.4 Document the mock-to-Supabase handoff with proposed PostgreSQL tables, indexes, Auth mapping, organization membership, RLS policy matrix, environment variables, and repository replacement order, and verify every mock entity maps to a documented persistence model
