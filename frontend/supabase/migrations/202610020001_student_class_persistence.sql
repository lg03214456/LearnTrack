begin;

alter table public.students
  add column if not exists gender text check (gender in ('男', '女')),
  add column if not exists revision integer not null default 1
    check (revision > 0);

alter table public.course_classes drop constraint if exists course_classes_status_check;
alter table public.course_classes
  add column if not exists code text,
  add column if not exists class_type text not null default 'progress'
    check (class_type in ('progress', 'individual')),
  add column if not exists capacity integer check (capacity is null or capacity > 0),
  add column if not exists progress integer not null default 0
    check (progress between 0 and 100),
  add column if not exists revision integer not null default 1
    check (revision > 0),
  add constraint course_classes_status_check
    check (status in ('recruiting', 'active', 'inactive', 'completed', 'archived'));

create unique index if not exists course_classes_organization_code_idx
  on public.course_classes (organization_id, lower(code)) where code is not null;

alter table public.class_enrollments
  add column if not exists revision integer not null default 1
    check (revision > 0),
  add column if not exists updated_at timestamptz not null default now();

alter table public.class_assignments
  add column if not exists revision integer not null default 1
    check (revision > 0),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.student_profiles (
  student_id text primary key,
  organization_id text not null,
  phone text not null default '',
  school text not null default '',
  grade text not null default '',
  notes text,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (student_id, organization_id)
    references public.students(id, organization_id) on delete cascade
);

create table if not exists public.class_subjects (
  organization_id text not null,
  class_id text not null,
  subject_code text not null check (length(btrim(subject_code)) > 0),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (class_id, subject_code),
  foreign key (class_id, organization_id)
    references public.course_classes(id, organization_id) on delete cascade
);

create table if not exists public.class_grade_scopes (
  organization_id text not null,
  class_id text not null,
  grade_code text not null check (length(btrim(grade_code)) > 0),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (class_id, grade_code),
  foreign key (class_id, organization_id)
    references public.course_classes(id, organization_id) on delete cascade
);

create table if not exists public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  class_id text not null,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  timezone text not null default 'Asia/Taipei' check (length(btrim(timezone)) > 0),
  room text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  foreign key (class_id, organization_id)
    references public.course_classes(id, organization_id) on delete cascade,
  unique (organization_id, class_id, weekday, starts_at, ends_at)
);

create index if not exists student_profiles_organization_student_idx
  on public.student_profiles (organization_id, student_id);
create index if not exists class_subjects_organization_class_position_idx
  on public.class_subjects (organization_id, class_id, position);
create index if not exists class_grade_scopes_organization_class_position_idx
  on public.class_grade_scopes (organization_id, class_id, position);
create index if not exists class_schedules_organization_class_status_idx
  on public.class_schedules (organization_id, class_id, status, weekday, starts_at);
create index if not exists class_enrollments_organization_class_status_idx
  on public.class_enrollments (organization_id, class_id, status, student_id);
create index if not exists class_assignments_organization_class_status_idx
  on public.class_assignments (organization_id, class_id, status, membership_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at before update on public.students
for each row execute function public.set_updated_at();
drop trigger if exists course_classes_set_updated_at on public.course_classes;
create trigger course_classes_set_updated_at before update on public.course_classes
for each row execute function public.set_updated_at();
drop trigger if exists student_profiles_set_updated_at on public.student_profiles;
create trigger student_profiles_set_updated_at before update on public.student_profiles
for each row execute function public.set_updated_at();
drop trigger if exists class_subjects_set_updated_at on public.class_subjects;
create trigger class_subjects_set_updated_at before update on public.class_subjects
for each row execute function public.set_updated_at();
drop trigger if exists class_grade_scopes_set_updated_at on public.class_grade_scopes;
create trigger class_grade_scopes_set_updated_at before update on public.class_grade_scopes
for each row execute function public.set_updated_at();
drop trigger if exists class_schedules_set_updated_at on public.class_schedules;
create trigger class_schedules_set_updated_at before update on public.class_schedules
for each row execute function public.set_updated_at();
drop trigger if exists class_enrollments_set_updated_at on public.class_enrollments;
create trigger class_enrollments_set_updated_at before update on public.class_enrollments
for each row execute function public.set_updated_at();
drop trigger if exists class_assignments_set_updated_at on public.class_assignments;
create trigger class_assignments_set_updated_at before update on public.class_assignments
for each row execute function public.set_updated_at();

alter table public.student_profiles enable row level security;
alter table public.class_subjects enable row level security;
alter table public.class_grade_scopes enable row level security;
alter table public.class_schedules enable row level security;

revoke all on table public.student_profiles, public.class_subjects,
  public.class_grade_scopes, public.class_schedules from anon, authenticated;
grant select, insert, update on table public.student_profiles, public.class_subjects,
  public.class_grade_scopes, public.class_schedules to authenticated;

create policy student_profiles_select_by_relationship
on public.student_profiles for select to authenticated
using (
  private.can_access_student(organization_id, student_id, 'student_profiles.read')
  or private.has_platform_permission('platform.tenant_data.read')
);
create policy student_profiles_insert_by_relationship
on public.student_profiles for insert to authenticated
with check (private.can_access_student(organization_id, student_id, 'student_profiles.manage'));
create policy student_profiles_update_by_relationship
on public.student_profiles for update to authenticated
using (private.can_access_student(organization_id, student_id, 'student_profiles.manage'))
with check (private.can_access_student(organization_id, student_id, 'student_profiles.manage'));

create policy class_subjects_select_by_relationship
on public.class_subjects for select to authenticated
using (
  private.can_access_class(organization_id, class_id, 'classes.read')
  or private.has_platform_permission('platform.tenant_data.read')
);
create policy class_subjects_insert_by_relationship
on public.class_subjects for insert to authenticated
with check (private.can_access_class(organization_id, class_id, 'classes.manage'));
create policy class_subjects_update_by_relationship
on public.class_subjects for update to authenticated
using (private.can_access_class(organization_id, class_id, 'classes.manage'))
with check (private.can_access_class(organization_id, class_id, 'classes.manage'));

create policy class_grade_scopes_select_by_relationship
on public.class_grade_scopes for select to authenticated
using (
  private.can_access_class(organization_id, class_id, 'classes.read')
  or private.has_platform_permission('platform.tenant_data.read')
);
create policy class_grade_scopes_insert_by_relationship
on public.class_grade_scopes for insert to authenticated
with check (private.can_access_class(organization_id, class_id, 'classes.manage'));
create policy class_grade_scopes_update_by_relationship
on public.class_grade_scopes for update to authenticated
using (private.can_access_class(organization_id, class_id, 'classes.manage'))
with check (private.can_access_class(organization_id, class_id, 'classes.manage'));

create policy class_schedules_select_by_relationship
on public.class_schedules for select to authenticated
using (
  private.can_access_class(organization_id, class_id, 'classes.read')
  or private.has_platform_permission('platform.tenant_data.read')
);
create policy class_schedules_insert_by_relationship
on public.class_schedules for insert to authenticated
with check (private.can_access_class(organization_id, class_id, 'classes.manage'));
create policy class_schedules_update_by_relationship
on public.class_schedules for update to authenticated
using (private.can_access_class(organization_id, class_id, 'classes.manage'))
with check (private.can_access_class(organization_id, class_id, 'classes.manage'));

revoke all on function public.set_updated_at() from public;

commit;
