## 1. Student Roster Data Boundary

- [x] 1.1 Define `ListStudentsQuery`, selected-class context, membership-aware student row, summary, pagination, and unavailable-class result types; verify strict TypeScript checking passes
- [x] 1.2 Replace flattened single-class mock membership with stable enrollment records, including at least one multi-class student; verify automated relationship tests resolve every student and class foreign key
- [x] 1.3 Implement an organization-scoped student roster repository query that combines class, search, and status filters, deduplicates organization results, and returns reconciled summaries; verify repository contract tests cover organization, class, multi-membership, empty-class, and unavailable-class cases

## 2. URL-backed Roster

- [x] 2.1 Parse supported student roster search parameters in the server page and pass a validated query to the repository; verify valid, missing, and malformed parameters produce the specified result states
- [x] 2.2 Refactor the student roster into focused summary, selected-context, filter, table, and empty/error components without importing server fixtures; verify lint and Client/Server boundary checks pass
- [x] 2.3 Synchronize class, search, status, and page filters with the URL while preserving unrelated supported parameters and resetting pagination on filter changes; verify reload, clear, class-switch, search-within-class, and browser-history component tests pass
- [x] 2.4 Render multiple class memberships without duplicating organization-wide students; verify component tests show one student in each enrolled class and only once in the organization roster

## 3. Class-to-Roster Navigation

- [x] 3.1 Add an accessible "查看學生名單" link to each class card using its stable class identifier; verify navigation tests resolve to `/students?classId=<id>`
- [x] 3.2 Render class-specific summary labels and values for a valid class filter and organization summaries when no class is selected; verify every visible metric reconciles with repository fixtures
- [x] 3.3 Add distinct available-empty and unavailable-class states with a clear return-to-roster action; verify tests do not reveal unavailable class details or silently fall back to organization rows

## 4. Quality and Documentation

- [x] 4.1 Verify class navigation and all roster filter combinations at desktop and mobile widths, including keyboard labels and absence of whole-page horizontal overflow
- [x] 4.2 Update `docs/codemap.md` and `docs/ui-backend-actions.md` for the enrollment-aware query and class-card navigation, then run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` and report warnings separately from failures

## 5. Inline Filter Interaction Revision

- [x] 5.1 Remove standalone clear and search-submit controls, provide empty-value all options, debounce search into URL replacement, keep select changes immediate, remove empty-result clear links, and verify no toast or floating notice is introduced; update tests and action-flow documentation
