begin;

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete restrict,
  code text not null check (code = lower(btrim(code)) and length(btrim(code)) between 2 and 50),
  name text not null check (length(btrim(name)) between 1 and 100),
  class_code_prefix text not null
    check (class_code_prefix = upper(btrim(class_code_prefix)) and class_code_prefix ~ '^[A-Z]{2,8}$'),
  status text not null default 'active' check (status in ('active', 'inactive')),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, class_code_prefix)
);

create table if not exists public.class_code_sequences (
  organization_id text not null references public.organizations(id) on delete restrict,
  prefix text not null check (prefix = upper(btrim(prefix)) and prefix ~ '^[A-Z]{2,8}$'),
  last_number integer not null default 0 check (last_number >= 0),
  primary key (organization_id, prefix)
);

create index if not exists subjects_organization_status_position_idx
  on public.subjects (organization_id, status, position, name);

drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at before update on public.subjects
for each row execute function public.set_updated_at();

alter table public.subjects enable row level security;
alter table public.class_code_sequences enable row level security;

revoke all on table public.subjects, public.class_code_sequences from anon, authenticated;
grant select, insert, update on table public.subjects to authenticated;

drop policy if exists subjects_select_by_permission on public.subjects;
create policy subjects_select_by_permission
on public.subjects for select to authenticated using (
  private.has_permission(organization_id, 'classes.read')
  or private.has_platform_permission('platform.tenant_data.read')
);

drop policy if exists subjects_insert_by_manager on public.subjects;
create policy subjects_insert_by_manager
on public.subjects for insert to authenticated with check (
  private.has_organization_wide_permission(organization_id, 'classes.manage')
);

drop policy if exists subjects_update_by_manager on public.subjects;
create policy subjects_update_by_manager
on public.subjects for update to authenticated
using (private.has_organization_wide_permission(organization_id, 'classes.manage'))
with check (private.has_organization_wide_permission(organization_id, 'classes.manage'));

insert into public.subjects
  (organization_id, code, name, class_code_prefix, status, position)
select organization.id, subject.code, subject.name, subject.prefix, 'active', subject.position
from public.organizations organization
cross join (
  values
    ('math', '數學', 'MAT', 10),
    ('english', '英文', 'ENG', 20),
    ('physics', '理化', 'PHY', 30),
    ('biology', '生物', 'BIO', 40)
) as subject(code, name, prefix, position)
on conflict (organization_id, code) do update set
  name = excluded.name,
  class_code_prefix = excluded.class_code_prefix,
  status = excluded.status,
  position = excluded.position;

create or replace function public.save_class_aggregate(
  target_organization_id text,
  target_class_id text,
  expected_revision integer,
  class_name text,
  class_code text,
  requested_class_type text,
  class_capacity integer,
  requested_class_status text,
  subject_codes text[],
  grade_codes text[],
  teacher_membership_id text,
  schedule_rows jsonb,
  student_ids text[]
)
returns table (class_id text, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  persisted_class_id text := coalesce(nullif(btrim(target_class_id), ''), 'cls-' || gen_random_uuid()::text);
  persisted_class_code text;
  selected_prefix text;
  next_number integer;
  current_revision integer;
  selected_student_count integer := coalesce(array_length(student_ids, 1), 0);
  selected_subject_count integer := coalesce(array_length(subject_codes, 1), 0);
  schedule_row jsonb;
begin
  if not private.has_organization_wide_permission(target_organization_id, 'classes.manage') then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if nullif(btrim(class_name), '') is null then
    raise exception using errcode = '23514', message = 'INVALID_CLASS';
  end if;
  if selected_subject_count = 0 or exists (
    select 1
    from unnest(subject_codes) requested_subject_code
    where not exists (
      select 1 from public.subjects s
      where s.organization_id = target_organization_id
        and s.code = requested_subject_code
        and s.status = 'active'
    )
  ) then
    raise exception using errcode = '23503', message = 'INVALID_SUBJECT';
  end if;
  if class_capacity is not null and selected_student_count > class_capacity then
    raise exception using errcode = '23514', message = 'CAPACITY_EXCEEDED';
  end if;
  if teacher_membership_id is not null and not exists (
    select 1 from public.organization_memberships m
    where m.id = teacher_membership_id
      and m.organization_id = target_organization_id
      and m.status = 'active'
  ) then
    raise exception using errcode = '23503', message = 'INVALID_TEACHER';
  end if;
  if exists (
    select 1 from unnest(coalesce(student_ids, array[]::text[])) requested_student_id
    where not exists (
      select 1 from public.students s
      where s.id = requested_student_id
        and s.organization_id = target_organization_id
        and s.status <> 'archived'
    )
  ) then
    raise exception using errcode = '23503', message = 'INVALID_STUDENT';
  end if;

  select c.revision, c.code into current_revision, persisted_class_code
  from public.course_classes c
  where c.id = persisted_class_id and c.organization_id = target_organization_id
  for update;

  if found then
    if expected_revision is null or current_revision <> expected_revision then
      raise exception using errcode = '40001', message = 'REVISION_CONFLICT';
    end if;
    update public.course_classes c set
      name = btrim(class_name),
      class_type = requested_class_type,
      capacity = class_capacity,
      status = requested_class_status,
      revision = c.revision + 1
    where c.id = persisted_class_id and c.organization_id = target_organization_id
    returning c.revision into current_revision;
  else
    if target_class_id is not null or expected_revision is not null then
      raise exception using errcode = 'P0002', message = 'CLASS_NOT_FOUND';
    end if;

    if selected_subject_count = 1 then
      select s.class_code_prefix into selected_prefix
      from public.subjects s
      where s.organization_id = target_organization_id
        and s.code = subject_codes[1]
        and s.status = 'active';
    else
      selected_prefix := 'MIX';
    end if;

    insert into public.class_code_sequences (organization_id, prefix, last_number)
    values (target_organization_id, selected_prefix, 1)
    on conflict (organization_id, prefix) do update
      set last_number = class_code_sequences.last_number + 1
    returning last_number into next_number;

    persisted_class_code := selected_prefix || '-' || lpad(next_number::text, 4, '0');

    insert into public.course_classes
      (id, organization_id, name, code, class_type, capacity, status, revision)
    values
      (persisted_class_id, target_organization_id, btrim(class_name), persisted_class_code,
       requested_class_type, class_capacity, requested_class_status, 1)
    returning course_classes.revision into current_revision;
  end if;

  delete from public.class_subjects where class_subjects.class_id = persisted_class_id;
  insert into public.class_subjects (organization_id, class_id, subject_code, position)
  select target_organization_id, persisted_class_id, value, ordinality - 1
  from unnest(subject_codes) with ordinality as selected_subjects(value, ordinality);

  delete from public.class_grade_scopes where class_grade_scopes.class_id = persisted_class_id;
  insert into public.class_grade_scopes (organization_id, class_id, grade_code, position)
  select target_organization_id, persisted_class_id, value, ordinality - 1
  from unnest(coalesce(grade_codes, array[]::text[])) with ordinality as grades(value, ordinality);

  update public.class_assignments set status = 'inactive', ended_at = now()
  where class_assignments.class_id = persisted_class_id and status = 'active';
  if teacher_membership_id is not null then
    insert into public.class_assignments (organization_id, class_id, membership_id, status)
    values (target_organization_id, persisted_class_id, teacher_membership_id, 'active')
    on conflict (class_id, membership_id) do update
      set status = 'active', ended_at = null, revision = class_assignments.revision + 1;
  end if;

  delete from public.class_schedules where class_schedules.class_id = persisted_class_id;
  for schedule_row in select value from jsonb_array_elements(coalesce(schedule_rows, '[]'::jsonb))
  loop
    insert into public.class_schedules
      (organization_id, class_id, weekday, starts_at, ends_at, room)
    values
      (target_organization_id, persisted_class_id, (schedule_row->>'weekday')::smallint,
       (schedule_row->>'startTime')::time, (schedule_row->>'endTime')::time,
       coalesce(schedule_row->>'room', ''));
  end loop;

  update public.class_enrollments set status = 'withdrawn', withdrawn_at = now()
  where class_enrollments.class_id = persisted_class_id
    and class_enrollments.status = 'active'
    and not (class_enrollments.student_id = any(coalesce(student_ids, array[]::text[])));
  insert into public.class_enrollments (organization_id, class_id, student_id, status)
  select target_organization_id, persisted_class_id, requested_student_id, 'active'
  from unnest(coalesce(student_ids, array[]::text[])) requested_student_id
  on conflict (class_id, student_id) do update
    set status = 'active', withdrawn_at = null, revision = class_enrollments.revision + 1;

  return query select persisted_class_id, current_revision;
end;
$$;

commit;
