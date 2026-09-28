begin;

create table public.platform_permissions (
  code text primary key,
  label text not null check (length(btrim(label)) > 0),
  created_at timestamptz not null default now()
);

create table public.platform_operators (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null unique references public.profiles(id) on delete restrict,
  role_code text not null default 'platform-owner' check (role_code = 'platform-owner'),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_role_permissions (
  role_code text not null check (role_code = 'platform-owner'),
  permission_code text not null references public.platform_permissions(code) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_code, permission_code)
);

create table public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  operator_profile_id text references public.profiles(id) on delete set null,
  target_organization_id text references public.organizations(id) on delete restrict,
  action text not null check (length(btrim(action)) > 0),
  resource_type text not null check (length(btrim(resource_type)) > 0),
  resource_id text,
  result text not null check (result in ('succeeded', 'denied', 'failed')),
  request_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index platform_audit_logs_operator_created_idx
  on public.platform_audit_logs (operator_profile_id, created_at desc);
create index platform_audit_logs_target_created_idx
  on public.platform_audit_logs (target_organization_id, created_at desc);

insert into public.platform_permissions (code, label) values
  ('platform.organizations.read', '查看機構清單'),
  ('platform.tenant_data.read', '唯讀檢視機構資料'),
  ('platform.audit.read', '查看平台稽核紀錄');

insert into public.platform_role_permissions (role_code, permission_code)
select 'platform-owner', code from public.platform_permissions;

create function public.reject_platform_audit_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'platform_audit_logs are append-only';
end;
$$;

create trigger platform_audit_logs_reject_update_or_delete
before update or delete on public.platform_audit_logs
for each row execute function public.reject_platform_audit_log_mutation();

create function private.has_platform_permission(target_permission_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_operators po
    join public.profiles p on p.id = po.profile_id
    join public.platform_role_permissions prp on prp.role_code = po.role_code
    where p.auth_user_id = auth.uid()
      and po.status = 'active'
      and prp.permission_code = target_permission_code
  )
$$;

alter table public.platform_permissions enable row level security;
alter table public.platform_operators enable row level security;
alter table public.platform_role_permissions enable row level security;
alter table public.platform_audit_logs enable row level security;

revoke all on table
  public.platform_permissions,
  public.platform_operators,
  public.platform_role_permissions,
  public.platform_audit_logs
from anon, authenticated;

grant select on table
  public.platform_permissions,
  public.platform_operators,
  public.platform_role_permissions,
  public.platform_audit_logs
to authenticated;

revoke all on function public.reject_platform_audit_log_mutation() from public;
revoke all on function private.has_platform_permission(text) from public;
grant execute on function private.has_platform_permission(text) to authenticated;

create policy platform_operators_select_self
on public.platform_operators for select to authenticated
using (
  profile_id = private.current_profile_id()
  and status = 'active'
);

create policy platform_permissions_select_operator
on public.platform_permissions for select to authenticated
using (private.has_platform_permission('platform.organizations.read'));

create policy platform_role_permissions_select_operator
on public.platform_role_permissions for select to authenticated
using (private.has_platform_permission('platform.organizations.read'));

create policy platform_audit_logs_select_auditor
on public.platform_audit_logs for select to authenticated
using (private.has_platform_permission('platform.audit.read'));

drop policy organizations_select_active_member on public.organizations;
create policy organizations_select_active_member_or_platform_reader
on public.organizations for select to authenticated
using (
  private.is_active_organization_member(id)
  or (status = 'active' and private.has_platform_permission('platform.organizations.read'))
);

drop policy students_select_by_permission_relationship on public.students;
create policy students_select_by_permission_relationship_or_platform_reader
on public.students for select to authenticated
using (
  private.can_access_student(organization_id, id, 'students.read')
  or private.has_platform_permission('platform.tenant_data.read')
);

drop policy course_classes_select_by_permission_relationship on public.course_classes;
create policy course_classes_select_by_permission_relationship_or_platform_reader
on public.course_classes for select to authenticated
using (
  private.can_access_class(organization_id, id, 'classes.read')
  or private.has_platform_permission('platform.tenant_data.read')
);

drop policy class_enrollments_select_by_student_or_class_relationship on public.class_enrollments;
create policy class_enrollments_select_tenant_or_platform_reader
on public.class_enrollments for select to authenticated
using (
  private.can_access_student(organization_id, student_id, 'students.read')
  or private.can_access_class(organization_id, class_id, 'classes.read')
  or private.has_platform_permission('platform.tenant_data.read')
);

commit;
