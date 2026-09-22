## 1. Domain contracts and mock persistence

- [x] 1.1 Add client-safe class-session, session-member, daily-progress entry, command, and view-model types; verify TypeScript accepts the status unions and optional note/correction fields.
- [x] 1.2 Add normalized, resettable mock `ClassSession`, `ClassSessionMember`, and append-only `StudentSessionProgress` records; verify focused store tests restore deterministic seed state.
- [x] 1.3 Extend student learning items with revision and latest optional note/update metadata needed for optimistic updates; verify existing curriculum fixtures and tests remain valid.

## 2. Repository composition

- [x] 2.1 Implement a pure daily-workspace composition function joining class, enrollment, attendance, student plans, versions, and learning items; verify mixed-grade students receive only their own active curricula.
- [x] 2.2 Implement the server-only class-session repository for opening existing sessions, snapshotting eligible members for new sessions, and reading history; verify ended/archived members are excluded only from newly created rosters.
- [x] 2.3 Add organization and assigned-class scope filtering to every daily-workspace query; verify cross-organization and unassigned-class reads return no data.

## 3. Mutations and authorization

- [x] 3.1 Implement a daily-progress service that validates active actor membership, `progress.manage`, class scope, roster membership, active plan ownership, learning-item ownership, bounded notes, and revisions; verify invalid relationship chains are rejected.
- [x] 3.2 Implement all-or-nothing batch staging that appends session history and updates current learning-item status only after every entry passes; verify one invalid or stale entry leaves all stores unchanged.
- [x] 3.3 Implement correction-by-successor with required reason and `supersedesId`; verify the original history remains and current state reflects the latest valid correction.
- [x] 3.4 Add Server Actions for opening, saving, completing, and correcting a session with safe FormData parsing, structured errors, and targeted revalidation; verify action tests cover success, validation, forbidden, and conflict results.

## 4. Class daily-workspace UI

- [x] 4.1 Add `/classes/[classId]?tab=today&date=YYYY-MM-DD` with a second-level back action, class/session header, status summary, and access-denied/not-found states; verify route rendering tests cover each state.
- [x] 4.2 Add a roster editor that shows attendance, each student's active plan/version, current or next item, status selection, optional note, and `本次不更新`; verify absent/leave members default to no update and notes remain optional.
- [x] 4.3 Allow a student to add multiple progress rows from multiple active plans without selecting a class curriculum; verify component tests add/remove entries and constrain item choices to the selected plan.
- [x] 4.4 Add pending/saving/error/success feedback, keyboard labels, focus management, and a pre-save affected-student summary; verify accessibility queries and failure recovery in UI tests.
- [x] 4.5 Add a primary `進入今日課堂` action to class cards while preserving `查看學生名單` and edit/settings actions; verify stable destinations in class-view tests.

## 5. History and current-progress integration

- [x] 5.1 Add class-session history rendering with correction indicators and latest valid values; verify dated entries remain visible after later saves.
- [x] 5.2 Add or extend the student `課堂紀錄` view so daily class entries appear under the student without changing curriculum assignment; verify history is filtered by authorized student scope.
- [x] 5.3 Ensure aggregate and student progress continue deriving completion from current included learning-item statuses and never from notes; verify completion tests for `pending`, `in_progress`, and `completed`.

## 6. Documentation and verification

- [x] 6.1 Update the class/attendance, student, and curriculum codemaps plus UI-to-backend actions and user operation manual; verify links describe the new route and ownership boundaries.
- [x] 6.2 Extend the Supabase handoff with table definitions, foreign keys, indexes, correction audit strategy, transaction boundary, and organization/class/student RLS rules; verify it explicitly states that classes do not own curriculum versions.
- [x] 6.3 Run Prettier, ESLint, TypeScript, focused tests, the complete test suite, and the production build; verify every command succeeds without unrelated changes.
- [x] 6.4 Start the local app and browser-verify the class-card entry, mixed-version roster, optional notes, no-update defaults, multi-entry behavior, save result, history, and responsive layout.
