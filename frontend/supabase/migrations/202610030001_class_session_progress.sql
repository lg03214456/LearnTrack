begin;

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  class_id text not null,
  session_date date not null,
  schedule_id uuid references public.class_schedules(id) on delete set null,
  teacher_profile_id text references public.profiles(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, organization_id),
  unique (organization_id, class_id, session_date),
  foreign key (class_id, organization_id)
    references public.course_classes(id, organization_id) on delete restrict
);

create table if not exists public.class_session_members (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  class_session_id uuid not null,
  student_id text not null,
  enrollment_class_id text not null,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (class_session_id, student_id),
  foreign key (class_session_id, organization_id)
    references public.class_sessions(id, organization_id) on delete cascade,
  foreign key (student_id, organization_id)
    references public.students(id, organization_id) on delete restrict,
  foreign key (enrollment_class_id, student_id)
    references public.class_enrollments(class_id, student_id) on delete restrict
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  class_session_id uuid not null,
  session_member_id uuid not null,
  student_id text not null,
  status text not null check (status in ('present', 'late', 'absent', 'leave')),
  note text not null default '' check (length(note) <= 300),
  recorded_by_profile_id text references public.profiles(id) on delete set null,
  supersedes_id uuid unique references public.attendance_records(id) on delete restrict,
  correction_reason text check (correction_reason is null or length(correction_reason) between 1 and 200),
  revision integer not null default 1 check (revision > 0),
  recorded_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (class_session_id, organization_id)
    references public.class_sessions(id, organization_id) on delete cascade,
  foreign key (session_member_id, organization_id)
    references public.class_session_members(id, organization_id) on delete cascade,
  foreign key (student_id, organization_id)
    references public.students(id, organization_id) on delete restrict
);

create table if not exists public.student_session_progress (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  class_session_id uuid not null,
  session_member_id uuid not null,
  student_id text not null,
  study_plan_id text not null,
  learning_item_id text not null,
  status_after_session text not null check (status_after_session in ('pending', 'in_progress', 'completed')),
  note text not null default '' check (length(note) <= 300),
  recorded_by_profile_id text references public.profiles(id) on delete set null,
  supersedes_id uuid unique references public.student_session_progress(id) on delete restrict,
  correction_reason text check (correction_reason is null or length(correction_reason) between 1 and 200),
  revision integer not null default 1 check (revision > 0),
  recorded_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (class_session_id, organization_id)
    references public.class_sessions(id, organization_id) on delete cascade,
  foreign key (session_member_id, organization_id)
    references public.class_session_members(id, organization_id) on delete cascade,
  foreign key (student_id, organization_id)
    references public.students(id, organization_id) on delete restrict
);

create index if not exists class_sessions_organization_class_date_idx
  on public.class_sessions (organization_id, class_id, session_date desc);
create index if not exists class_session_members_organization_student_idx
  on public.class_session_members (organization_id, student_id, class_session_id);
create index if not exists attendance_records_member_recorded_idx
  on public.attendance_records (organization_id, session_member_id, recorded_at desc);
create index if not exists student_session_progress_student_recorded_idx
  on public.student_session_progress (organization_id, student_id, recorded_at desc);
create index if not exists student_session_progress_session_item_idx
  on public.student_session_progress (class_session_id, session_member_id, learning_item_id);

drop trigger if exists class_sessions_set_updated_at on public.class_sessions;
create trigger class_sessions_set_updated_at before update on public.class_sessions
for each row execute function public.set_updated_at();
drop trigger if exists class_session_members_set_updated_at on public.class_session_members;
create trigger class_session_members_set_updated_at before update on public.class_session_members
for each row execute function public.set_updated_at();

alter table public.class_sessions enable row level security;
alter table public.class_session_members enable row level security;
alter table public.attendance_records enable row level security;
alter table public.student_session_progress enable row level security;

revoke all on table public.class_sessions, public.class_session_members,
  public.attendance_records, public.student_session_progress from anon, authenticated;
grant select, insert, update on table public.class_sessions, public.class_session_members to authenticated;
grant select, insert on table public.attendance_records, public.student_session_progress to authenticated;

create policy class_sessions_select_by_class
on public.class_sessions for select to authenticated using (
  private.can_access_class(organization_id, class_id, 'progress.read')
  or private.can_access_class(organization_id, class_id, 'attendance.read')
);
create policy class_sessions_insert_by_class
on public.class_sessions for insert to authenticated with check (
  private.can_access_class(organization_id, class_id, 'progress.manage')
  or private.can_access_class(organization_id, class_id, 'attendance.manage')
);
create policy class_sessions_update_by_class
on public.class_sessions for update to authenticated
using (private.can_access_class(organization_id, class_id, 'progress.manage')
  or private.can_access_class(organization_id, class_id, 'attendance.manage'))
with check (private.can_access_class(organization_id, class_id, 'progress.manage')
  or private.can_access_class(organization_id, class_id, 'attendance.manage'));

create policy class_session_members_select_by_relationship
on public.class_session_members for select to authenticated using (
  private.can_access_student(organization_id, student_id, 'progress.read')
  or private.can_access_student(organization_id, student_id, 'attendance.read')
);
create policy class_session_members_insert_by_relationship
on public.class_session_members for insert to authenticated with check (
  private.can_access_student(organization_id, student_id, 'progress.manage')
  or private.can_access_student(organization_id, student_id, 'attendance.manage')
);

create policy attendance_records_select_by_relationship
on public.attendance_records for select to authenticated using (
  private.can_access_student(organization_id, student_id, 'attendance.read')
);
create policy attendance_records_insert_by_relationship
on public.attendance_records for insert to authenticated with check (
  private.can_access_student(organization_id, student_id, 'attendance.manage')
);

create policy student_session_progress_select_by_relationship
on public.student_session_progress for select to authenticated using (
  private.can_access_student(organization_id, student_id, 'progress.read')
);
create policy student_session_progress_insert_by_relationship
on public.student_session_progress for insert to authenticated with check (
  private.can_access_student(organization_id, student_id, 'progress.manage')
);

commit;
