# Production Mock persistence inventory

This inventory is the migration checklist for every production import of
`src/server/data/mock`. Tests and files inside the Mock adapter directory are not production
consumers. The source scan was last verified on 2026-10-02.

| Mock store | Current production consumers | Persisted entities | Target tables / adapter |
|---|---|---|---|
| `access.ts` | `auth/identity-core.ts`, `auth/mock-providers.ts`, `app/actions/access-actions.ts`, `repositories/access.ts`, account/access services | profiles, organization memberships, roles, permission assignments | Existing `profiles`, `organization_memberships`, `roles`, `permissions`, `role_permissions`, `membership_roles`; Supabase access/account adapters |
| `fixtures.ts` | account settings page, attendance, class, curriculum, dashboard, student and session repositories/services | students, class summaries, attendance rows, dashboard fixtures | Existing `students`, `course_classes`; new student profile, attendance, session and aggregate query adapters |
| `relations.ts` | organization context, curriculum, dashboard and student-detail services | organizations, enrollments | Existing `organizations`, `class_enrollments`; Supabase organization/enrollment adapters |
| `class-management.ts` | class, class-session, student roster/detail repositories and services | class aggregate, enrollments, assignments, subjects, grades, schedules | Existing `course_classes`, `class_enrollments`, `class_assignments`; new `class_subjects`, `class_grade_scopes`, `class_schedules`; Supabase class adapter |
| `student-profile.ts` | student roster/detail repositories and student-detail service | profile details and contacts | New `student_profiles`, existing `student_contacts`; Supabase student detail/contact adapter |
| `class-sessions.ts` | class-session repository/service and student detail | teaching sessions, members, progress | New `class_sessions`, `class_session_members`, `student_session_progress`; Supabase class-session adapter |
| `curriculum.ts` | curriculum and class-session repositories/services and student detail | catalogs, templates, versions, items, study plans, learning items | New reference catalogs, `curriculum_templates`, `curriculum_template_versions`, `curriculum_template_items`, `study_plans`, `student_learning_items`; Supabase curriculum adapter |

## Mapping rules

- Dashboard, progress, and analytics values are derived from authoritative tables; they are not
  copied into another writable fixture table.
- Mock adapters remain available only for tests and explicitly selected non-production development.
- Core modules that currently import Mock entity types must move those contracts to feature-safe or
  domain contract modules before the final production-import boundary is enabled.
- Each feature switches its read and mutation composition together so the application never reports
  a Mock write while reading the corresponding data from Supabase.

## Coverage command

Run from the repository root:

```powershell
rg -n "server/data/mock|data/mock" frontend/src --glob "!**/*.test.*"
```

Every result must either appear in the consumer column above or live under
`frontend/src/server/data/mock/` as an explicit Mock implementation. Task 9.1 replaces this manual
check with an enforced boundary test.
