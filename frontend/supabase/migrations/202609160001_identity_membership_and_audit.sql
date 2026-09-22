begin;

create table public.organizations (
  id text primary key,
  name text not null check (length(btrim(name)) > 0),
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null check (length(btrim(display_name)) > 0),
  login_email text,
  created_by_profile_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  constraint profiles_login_email_normalized check (
    login_email is null or login_email = lower(btrim(login_email))
  )
);

alter table public.profiles
  add constraint profiles_created_by_profile_fk
  foreign key (created_by_profile_id) references public.profiles(id) on delete set null;

create unique index profiles_login_email_unique
  on public.profiles (login_email)
  where login_email is not null;

create table public.organization_memberships (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete restrict,
  profile_id text not null references public.profiles(id) on delete restrict,
  status text not null default 'invited'
    check (status in ('invited', 'active', 'suspended', 'revoked')),
  invited_by_profile_id text references public.profiles(id) on delete set null,
  activated_at timestamptz,
  suspended_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id),
  unique (id, organization_id)
);

create table public.roles (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  description text not null default '',
  is_system boolean not null default false,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (id, organization_id)
);

create table public.permissions (
  code text primary key,
  module text not null check (length(btrim(module)) > 0),
  label text not null check (length(btrim(label)) > 0),
  depends_on text references public.permissions(code) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  organization_id text not null,
  role_id text not null,
  permission_code text not null references public.permissions(code) on delete cascade,
  scope_kind text not null check (
    scope_kind in ('organization-wide', 'assigned-classes', 'self-student', 'linked-students')
  ),
  created_at timestamptz not null default now(),
  primary key (role_id, permission_code),
  foreign key (role_id, organization_id)
    references public.roles(id, organization_id) on delete cascade
);

create table public.membership_roles (
  organization_id text not null,
  membership_id text not null,
  role_id text not null,
  assigned_by_profile_id text references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (membership_id, role_id),
  foreign key (membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete cascade,
  foreign key (role_id, organization_id)
    references public.roles(id, organization_id) on delete cascade
);

create table public.students (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete restrict,
  student_number text not null,
  display_name text not null check (length(btrim(display_name)) > 0),
  status text not null default 'active'
    check (status in ('active', 'leave', 'inactive', 'graduated', 'archived')),
  archived_at timestamptz,
  archived_by_profile_id text references public.profiles(id) on delete set null,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, student_number),
  unique (id, organization_id)
);

create table public.course_classes (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.class_enrollments (
  organization_id text not null,
  class_id text not null,
  student_id text not null,
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  enrolled_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  primary key (class_id, student_id),
  foreign key (class_id, organization_id)
    references public.course_classes(id, organization_id) on delete cascade,
  foreign key (student_id, organization_id)
    references public.students(id, organization_id) on delete cascade
);

create table public.class_assignments (
  organization_id text not null,
  class_id text not null,
  membership_id text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  assigned_by_profile_id text references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  primary key (class_id, membership_id),
  foreign key (class_id, organization_id)
    references public.course_classes(id, organization_id) on delete cascade,
  foreign key (membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete cascade
);

create table public.student_user_links (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  student_id text not null,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'disabled', 'unlinked')),
  linked_by_profile_id text references public.profiles(id) on delete set null,
  linked_at timestamptz not null default now(),
  disabled_at timestamptz,
  unlinked_at timestamptz,
  foreign key (student_id, organization_id)
    references public.students(id, organization_id) on delete cascade
);

create unique index student_user_links_one_active_per_student
  on public.student_user_links (student_id)
  where status = 'active';

create unique index student_user_links_one_active_per_auth_user
  on public.student_user_links (auth_user_id)
  where status = 'active';

create table public.student_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  student_id text not null,
  contact_profile_id text not null references public.profiles(id) on delete restrict,
  relationship_label text not null default 'contact'
    check (length(btrim(relationship_label)) > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by_profile_id text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  foreign key (student_id, organization_id)
    references public.students(id, organization_id) on delete cascade,
  unique (organization_id, student_id, contact_profile_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete restrict,
  actor_profile_id text references public.profiles(id) on delete set null,
  actor_name text not null check (length(btrim(actor_name)) > 0),
  action text not null check (length(btrim(action)) > 0),
  resource_type text not null check (length(btrim(resource_type)) > 0),
  resource_id text,
  result text not null check (result in ('succeeded', 'denied', 'failed')),
  request_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index organization_memberships_profile_status_idx
  on public.organization_memberships (profile_id, status, organization_id);
create index membership_roles_role_idx
  on public.membership_roles (role_id, membership_id);
create index role_permissions_permission_idx
  on public.role_permissions (permission_code, role_id, scope_kind);
create index students_organization_status_idx
  on public.students (organization_id, status, id);
create index class_enrollments_student_status_idx
  on public.class_enrollments (student_id, status, class_id);
create index class_assignments_membership_status_idx
  on public.class_assignments (membership_id, status, class_id);
create index student_user_links_auth_status_idx
  on public.student_user_links (auth_user_id, status, student_id);
create index student_contacts_profile_status_idx
  on public.student_contacts (contact_profile_id, status, student_id);
create index audit_logs_organization_created_idx
  on public.audit_logs (organization_id, created_at desc);
create index audit_logs_actor_created_idx
  on public.audit_logs (actor_profile_id, created_at desc);
create index audit_logs_resource_created_idx
  on public.audit_logs (resource_type, resource_id, created_at desc);

insert into public.permissions (code, module, label, depends_on) values
  ('students.read', 'students', '查看學生', null),
  ('students.manage', 'students', '管理學生', 'students.read'),
  ('student_profiles.read', 'student_profiles', '查看學生資料', 'students.read'),
  ('student_profiles.manage', 'student_profiles', '管理學生資料', 'student_profiles.read'),
  ('assessment_history.read', 'assessment_history', '查看評量紀錄', 'students.read'),
  ('assessment_history.manage', 'assessment_history', '管理評量紀錄', 'assessment_history.read'),
  ('classes.read', 'classes', '查看班級', null),
  ('classes.manage', 'classes', '管理班級', 'classes.read'),
  ('attendance.read', 'attendance', '查看出缺席', 'classes.read'),
  ('attendance.manage', 'attendance', '管理出缺席', 'attendance.read'),
  ('progress.read', 'progress', '查看學習進度', 'students.read'),
  ('progress.manage', 'progress', '管理學習進度', 'progress.read'),
  ('analytics.read', 'analytics', '查看分析', null),
  ('curriculum.read', 'curriculum', '查看教材', null),
  ('curriculum.manage', 'curriculum', '管理教材', 'curriculum.read'),
  ('study_plans.read', 'study_plans', '查看修課計畫', 'students.read'),
  ('study_plans.manage', 'study_plans', '管理修課計畫', 'study_plans.read'),
  ('accounts.read', 'accounts', '查看帳號', null),
  ('accounts.manage', 'accounts', '管理帳號', 'accounts.read'),
  ('roles.read', 'roles', '查看角色', null),
  ('roles.manage', 'roles', '管理角色', 'roles.read'),
  ('credentials.change_self', 'credentials', '變更自己的密碼', null),
  ('credentials.force_reset', 'credentials', '強制重設密碼', 'accounts.manage'),
  ('audit.read', 'audit', '查看操作紀錄', null);

create function public.reject_audit_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs are append-only';
end;
$$;

create trigger audit_logs_reject_update_or_delete
before update or delete on public.audit_logs
for each row execute function public.reject_audit_log_mutation();

commit;
