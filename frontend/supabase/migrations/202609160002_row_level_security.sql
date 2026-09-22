begin;

create schema if not exists private;

create function private.current_profile_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1
$$;

create function private.is_active_organization_member(target_organization_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.profiles p on p.id = m.profile_id
    where p.auth_user_id = auth.uid()
      and m.organization_id = target_organization_id
      and m.status = 'active'
  )
$$;

create function private.has_permission(
  target_organization_id text,
  target_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.profiles p on p.id = m.profile_id
    join public.membership_roles mr
      on mr.membership_id = m.id
     and mr.organization_id = m.organization_id
    join public.role_permissions rp
      on rp.role_id = mr.role_id
     and rp.organization_id = mr.organization_id
    where p.auth_user_id = auth.uid()
      and m.organization_id = target_organization_id
      and m.status = 'active'
      and rp.permission_code = target_permission_code
  )
$$;

create function private.has_organization_wide_permission(
  target_organization_id text,
  target_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.profiles p on p.id = m.profile_id
    join public.membership_roles mr
      on mr.membership_id = m.id
     and mr.organization_id = m.organization_id
    join public.role_permissions rp
      on rp.role_id = mr.role_id
     and rp.organization_id = mr.organization_id
    where p.auth_user_id = auth.uid()
      and m.organization_id = target_organization_id
      and m.status = 'active'
      and rp.permission_code = target_permission_code
      and rp.scope_kind = 'organization-wide'
  )
$$;

create function private.can_access_student(
  target_organization_id text,
  target_student_id text,
  target_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.profiles p on p.id = m.profile_id
    join public.membership_roles mr
      on mr.membership_id = m.id
     and mr.organization_id = m.organization_id
    join public.role_permissions rp
      on rp.role_id = mr.role_id
     and rp.organization_id = mr.organization_id
    where p.auth_user_id = auth.uid()
      and m.organization_id = target_organization_id
      and m.status = 'active'
      and rp.permission_code = target_permission_code
      and (
        rp.scope_kind = 'organization-wide'
        or (
          rp.scope_kind = 'assigned-classes'
          and exists (
            select 1
            from public.class_assignments ca
            join public.class_enrollments ce
              on ce.class_id = ca.class_id
             and ce.organization_id = ca.organization_id
            where ca.membership_id = m.id
              and ca.organization_id = target_organization_id
              and ca.status = 'active'
              and ce.student_id = target_student_id
              and ce.status = 'active'
          )
        )
        or (
          rp.scope_kind = 'self-student'
          and exists (
            select 1
            from public.student_user_links sul
            join public.students s
              on s.id = sul.student_id
             and s.organization_id = sul.organization_id
            where sul.auth_user_id = auth.uid()
              and sul.organization_id = target_organization_id
              and sul.student_id = target_student_id
              and sul.status = 'active'
              and s.status = 'active'
          )
        )
        or (
          rp.scope_kind = 'linked-students'
          and exists (
            select 1
            from public.student_contacts sc
            where sc.contact_profile_id = m.profile_id
              and sc.organization_id = target_organization_id
              and sc.student_id = target_student_id
              and sc.status = 'active'
          )
        )
      )
  )
$$;

create function private.can_access_class(
  target_organization_id text,
  target_class_id text,
  target_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.profiles p on p.id = m.profile_id
    join public.membership_roles mr
      on mr.membership_id = m.id
     and mr.organization_id = m.organization_id
    join public.role_permissions rp
      on rp.role_id = mr.role_id
     and rp.organization_id = mr.organization_id
    where p.auth_user_id = auth.uid()
      and m.organization_id = target_organization_id
      and m.status = 'active'
      and rp.permission_code = target_permission_code
      and (
        rp.scope_kind = 'organization-wide'
        or (
          rp.scope_kind = 'assigned-classes'
          and exists (
            select 1
            from public.class_assignments ca
            where ca.membership_id = m.id
              and ca.organization_id = target_organization_id
              and ca.class_id = target_class_id
              and ca.status = 'active'
          )
        )
        or (
          rp.scope_kind = 'self-student'
          and exists (
            select 1
            from public.student_user_links sul
            join public.students s
              on s.id = sul.student_id
             and s.organization_id = sul.organization_id
            join public.class_enrollments ce
              on ce.student_id = sul.student_id
             and ce.organization_id = sul.organization_id
            where sul.auth_user_id = auth.uid()
              and sul.organization_id = target_organization_id
              and sul.status = 'active'
              and s.status = 'active'
              and ce.class_id = target_class_id
              and ce.status = 'active'
          )
        )
        or (
          rp.scope_kind = 'linked-students'
          and exists (
            select 1
            from public.student_contacts sc
            join public.class_enrollments ce
              on ce.student_id = sc.student_id
             and ce.organization_id = sc.organization_id
            where sc.contact_profile_id = m.profile_id
              and sc.organization_id = target_organization_id
              and sc.status = 'active'
              and ce.class_id = target_class_id
              and ce.status = 'active'
          )
        )
      )
  )
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.membership_roles enable row level security;
alter table public.students enable row level security;
alter table public.course_classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.class_assignments enable row level security;
alter table public.student_user_links enable row level security;
alter table public.student_contacts enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table
  public.organizations,
  public.profiles,
  public.organization_memberships,
  public.roles,
  public.permissions,
  public.role_permissions,
  public.membership_roles,
  public.students,
  public.course_classes,
  public.class_enrollments,
  public.class_assignments,
  public.student_user_links,
  public.student_contacts,
  public.audit_logs
from anon, authenticated;

grant select on table
  public.organizations,
  public.profiles,
  public.organization_memberships,
  public.roles,
  public.permissions,
  public.role_permissions,
  public.membership_roles,
  public.students,
  public.course_classes,
  public.class_enrollments,
  public.class_assignments,
  public.student_user_links,
  public.student_contacts,
  public.audit_logs
to authenticated;

grant insert, update on table public.students, public.course_classes to authenticated;

revoke all on function public.reject_audit_log_mutation() from public;
revoke all on function private.current_profile_id() from public;
revoke all on function private.is_active_organization_member(text) from public;
revoke all on function private.has_permission(text, text) from public;
revoke all on function private.has_organization_wide_permission(text, text) from public;
revoke all on function private.can_access_student(text, text, text) from public;
revoke all on function private.can_access_class(text, text, text) from public;

grant usage on schema private to authenticated;
grant execute on function private.current_profile_id() to authenticated;
grant execute on function private.is_active_organization_member(text) to authenticated;
grant execute on function private.has_permission(text, text) to authenticated;
grant execute on function private.has_organization_wide_permission(text, text) to authenticated;
grant execute on function private.can_access_student(text, text, text) to authenticated;
grant execute on function private.can_access_class(text, text, text) to authenticated;

create policy organizations_select_active_member
on public.organizations
for select
to authenticated
using (private.is_active_organization_member(id));

create policy profiles_select_self_or_account_reader
on public.profiles
for select
to authenticated
using (
  (
    auth_user_id = auth.uid()
    and exists (
      select 1
      from public.organization_memberships own_membership
      where own_membership.profile_id = profiles.id
        and own_membership.status = 'active'
    )
  )
  or exists (
    select 1
    from public.organization_memberships target_membership
    where target_membership.profile_id = profiles.id
      and private.has_permission(target_membership.organization_id, 'accounts.read')
  )
);

create policy memberships_select_self_or_account_reader
on public.organization_memberships
for select
to authenticated
using (
  (
    profile_id = private.current_profile_id()
    and status = 'active'
  )
  or private.has_permission(organization_id, 'accounts.read')
);

create policy roles_select_active_member
on public.roles
for select
to authenticated
using (private.is_active_organization_member(organization_id));

create policy permissions_select_active_member
on public.permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.profile_id = private.current_profile_id()
      and membership.status = 'active'
  )
);

create policy role_permissions_select_active_member
on public.role_permissions
for select
to authenticated
using (private.is_active_organization_member(organization_id));

create policy membership_roles_select_self_or_account_reader
on public.membership_roles
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.id = membership_roles.membership_id
      and membership.profile_id = private.current_profile_id()
      and membership.status = 'active'
  )
  or private.has_permission(organization_id, 'accounts.read')
);

create policy students_select_by_permission_relationship
on public.students
for select
to authenticated
using (private.can_access_student(organization_id, id, 'students.read'));

create policy students_insert_organization_manager
on public.students
for insert
to authenticated
with check (private.has_organization_wide_permission(organization_id, 'students.manage'));

create policy students_update_by_permission_relationship
on public.students
for update
to authenticated
using (private.can_access_student(organization_id, id, 'students.manage'))
with check (private.can_access_student(organization_id, id, 'students.manage'));

create policy course_classes_select_by_permission_relationship
on public.course_classes
for select
to authenticated
using (private.can_access_class(organization_id, id, 'classes.read'));

create policy course_classes_insert_organization_manager
on public.course_classes
for insert
to authenticated
with check (private.has_organization_wide_permission(organization_id, 'classes.manage'));

create policy course_classes_update_by_permission_relationship
on public.course_classes
for update
to authenticated
using (private.can_access_class(organization_id, id, 'classes.manage'))
with check (private.can_access_class(organization_id, id, 'classes.manage'));

create policy class_enrollments_select_by_student_or_class_relationship
on public.class_enrollments
for select
to authenticated
using (
  private.can_access_student(organization_id, student_id, 'students.read')
  or private.can_access_class(organization_id, class_id, 'classes.read')
);

create policy class_assignments_select_self_or_account_reader
on public.class_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.id = class_assignments.membership_id
      and membership.profile_id = private.current_profile_id()
      and membership.status = 'active'
  )
  or private.has_permission(organization_id, 'accounts.read')
);

create policy student_user_links_select_self_or_account_reader
on public.student_user_links
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or private.has_permission(organization_id, 'accounts.read')
);

create policy student_contacts_select_self_or_account_reader
on public.student_contacts
for select
to authenticated
using (
  contact_profile_id = private.current_profile_id()
  or private.has_permission(organization_id, 'accounts.read')
);

create policy audit_logs_select_organization_auditor
on public.audit_logs
for select
to authenticated
using (private.has_organization_wide_permission(organization_id, 'audit.read'));

commit;
