## Context

See `proposal.md` for motivation and `specs/persona-access-experiences/spec.md` for observable behavior. The current authorization context supports only organization-wide and assigned-class scopes, while the switcher lists owner, admin, teacher, assistant, viewer, and inactive personas without explaining their workflows. Student and guardian records already exist in the product domain but are not identity scopes.

## Goals / Non-Goals

**Goals:**

- Express Owner, director, teacher, student, and parent as server-resolved personas with explicit permissions and data scopes.
- Keep route, action, service, and repository enforcement aligned with navigation visibility.
- Make the Mock switcher useful as a manual authorization test console.
- Preserve stable permission codes where possible and document future Supabase RLS mapping.

**Non-Goals:**

- Implement production login, invitations, password recovery, parent OTP, or Supabase RLS migrations.
- Complete a new student or parent portal visual design beyond safe route/navigation adaptation.
- Change the system architecture document or introduce a new deployment boundary.

## Decisions

### Extend data scope as a discriminated union

Add `self-student` and `linked-students` alongside organization-wide and assigned-classes. Store stable student IDs in server-resolved Mock memberships/relationships. This keeps repositories explicit and prevents overloading class scope for student or guardian access. A generic filter object was considered but rejected because it makes illegal scope combinations easier to construct.

### Separate Owner governance from director operations

Owner remains an immutable system role with all permissions. Director receives organization-wide operational permissions and account administration, but not role governance or Owner mutation. Reusing the current all-powerful administrator role was rejected because it does not model least privilege.

### Use permissions plus relationship scope

Students and parents reuse read permission codes only where the corresponding route is safe, while repositories additionally restrict returned records by self or guardian links. Permission alone is never proof of record access. Adding persona-specific permission codes for every screen was rejected unless a real behavior cannot be expressed by current codes.

### Make persona metadata client-safe

The Server resolves a small `PersonaExperience` view containing label, scope summary, recommended route, and primary operations. The switcher renders this metadata without importing Mock fixtures. Navigation is grouped or filtered from effective permissions and persona-safe destinations; direct URLs remain server enforced.

### Preserve internal and family-facing feedback boundaries

Parent and student results must include only explicitly published or parent-visible feedback. Internal teacher notes remain a separate field/contract and are never filtered only in the browser.

## Risks / Trade-offs

- [Existing pages assume organization or class scope] → Extend repository query contracts and fail closed before enabling student/parent navigation.
- [Read permission codes are broader than record ownership] → Require scope checks at repository and service boundaries and add cross-persona tests.
- [The Mock selector can be mistaken for authentication] → Retain the development-only notice and document Supabase Auth/RLS replacement.
- [Director expectations vary by institution] → Use a conservative default matrix that Owner can later customize without allowing Owner mutation.
- [Student/parent UI may expose staff-oriented language] → Initially expose only destinations whose View Models are safe, then propose a dedicated portal experience separately.

## Migration Plan

1. Extend client-safe scope and persona-experience contracts.
2. Add director, student, parent profiles, roles, memberships, guardian links, and central permission matrix fixtures.
3. Update policy/repository scope helpers and test direct access for every persona.
4. Update the switcher and role-permission UI with explanations and recommended flows.
5. Update the user operation manual and Supabase handoff notes; keep system architecture unchanged.
6. In production, map self and guardian scopes to authenticated profile/student/guardian relations and RLS before removing Mock personas.

Rollback restores the previous persona list and role defaults while leaving the expanded scope types unused.
