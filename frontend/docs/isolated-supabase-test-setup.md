# Isolated Supabase RLS test setup

Use a separate Supabase project or database branch. Do not point these tests at the shared Preview or
Production database. Never paste passwords, access tokens, JWTs, or secret keys into chat, source
control, screenshots, fixtures, or test output.

## 1. Create the isolated project

Create a Supabase project used only for automated LearnTrack verification. In that project, apply the
migrations in filename order from `frontend/supabase/migrations/`. The two newest student/class
migrations are:

1. `202610020001_student_class_persistence.sql`
2. `202610020002_student_class_functions.sql`

The earlier identity, RLS, and Platform Owner migrations must already be present. Do not run only the
two newest files against an empty project.

## 2. Keep test-only configuration local

Create `frontend/.env.rls-test.local` and keep it uncommitted. Configure these names with values from
the isolated project:

```dotenv
RLS_TEST_SUPABASE_URL=
RLS_TEST_SUPABASE_PUBLISHABLE_KEY=
RLS_TEST_SUPABASE_SECRET_KEY=

RLS_TEST_ORG_A_OWNER_EMAIL=
RLS_TEST_ORG_A_OWNER_PASSWORD=
RLS_TEST_ORG_B_OWNER_EMAIL=
RLS_TEST_ORG_B_OWNER_PASSWORD=
RLS_TEST_TEACHER_EMAIL=
RLS_TEST_TEACHER_PASSWORD=
RLS_TEST_STUDENT_EMAIL=
RLS_TEST_STUDENT_PASSWORD=
RLS_TEST_CONTACT_EMAIL=
RLS_TEST_CONTACT_PASSWORD=
RLS_TEST_PLATFORM_OWNER_EMAIL=
RLS_TEST_PLATFORM_OWNER_PASSWORD=
```

The secret key is permitted only for deterministic test setup and cleanup. Every authorization
assertion must sign in as the listed actor and query with that actor's access token; the secret key
must never be used to prove that RLS passed.

## 3. Prepare the actor matrix

Use synthetic test identities and data only:

| Actor | Required relationship |
|---|---|
| Organization A Owner | Active A membership with organization-wide student/class permissions |
| Organization B Owner | Active B membership with the same tenant permissions |
| Teacher | Active A membership, assigned to exactly one A class |
| Student | Active Auth link to exactly one A student |
| Contact | Active contact link to exactly one A student |
| Platform Owner | Active platform operator and no active organization membership |
| Anonymous | Publishable key without a signed-in user |

Seed at least one class and student in both A and B. Organization A also needs one assigned and one
unassigned class so teacher denial can be tested.

## 4. Required assertions

- A Owner reads and mutates A but cannot discover or mutate B.
- B Owner reads and mutates B but cannot discover or mutate A.
- Teacher reads the assigned class and its students, but not the unassigned class.
- Student and contact read only their linked student records.
- Platform Owner reads explicitly selected tenant data but cannot call tenant mutation functions.
- Anonymous receives no protected rows and cannot execute protected writes.
- Stale revisions return conflict and leave all aggregate tables unchanged.
- Invalid relationships and capacity failures roll back the complete aggregate.
- `audit_logs` and `platform_audit_logs` remain update/delete protected.

After these assertions pass, the student/class RLS task can be marked complete. Preview browser
acceptance remains a separate step.
