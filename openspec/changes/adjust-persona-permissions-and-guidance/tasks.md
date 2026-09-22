## 1. Persona and Scope Contracts

- [x] 1.1 Extend client-safe authorization scope contracts with self-student and linked-students variants plus persona experience metadata; verify strict TypeScript and Client/Server import boundaries
- [x] 1.2 Define a centralized Owner, director, teacher, student, and parent permission matrix with recommended routes and workflow summaries; verify matrix tests assert allowed and denied permissions

## 2. Mock Identity and Relationships

- [x] 2.1 Add director, student, and parent Mock profiles, roles, memberships, student identity links, and guardian-child links while preserving reset behavior; verify relationship and uniqueness tests
- [x] 2.2 Update identity resolution to derive organization-wide, assigned-class, self-student, or linked-students scope only from server-owned relations; verify inactive, missing, and forged-target cases fail closed

## 3. Authorization and Data Scope

- [x] 3.1 Add reusable policy helpers for class, student, Owner-protection, and family-visible feedback scope; verify every persona against assigned, self, linked, unrelated, and cross-organization records
- [x] 3.2 Apply the new scope to student roster/detail, progress, attendance, analytics, curriculum, class, account, and role read paths; verify students and parents receive no staff-wide data
- [x] 3.3 Protect account, role, class lifecycle, assessment, profile, curriculum, and enrollment writes with the revised matrix; verify director cannot mutate Owner/system roles and teacher/student/parent direct commands are rejected as specified

## 4. Persona Guidance UI

- [x] 4.1 Refactor the Mock selector to receive client-safe persona options and display role, scope, recommended start, and primary operations; verify all five requested personas are understandable before switching
- [x] 4.2 Update permission-aware navigation and post-switch destination handling for Owner, director, teacher, student, and parent; verify direct URLs remain server-enforced and the current page fails safely when no longer allowed
- [x] 4.3 Update role-permission and account views to use the revised role labels, least-privilege defaults, immutable Owner rules, and clear scope descriptions; verify accessible read-only and editable states

## 5. Documentation and Quality

- [x] 5.1 Update `docs/user-operation-manual.md` with the final permission matrix, persona switch walkthrough, allowed paths, denied operations, and Mock limitations; verify `docs/system-architecture.md` remains unchanged
- [x] 5.2 Update Code Map, UI/backend action notes, and Supabase handoff for self/guardian relations and RLS mapping; verify every documented boundary exists in code
- [x] 5.3 Run authorization, repository, service, action, component, and regression tests followed by `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; report warnings separately
- [x] 5.4 Browser-verify persona switching, visible guidance, navigation, direct URL denial, mutation visibility, long labels, keyboard use, and mobile overflow for all requested personas
