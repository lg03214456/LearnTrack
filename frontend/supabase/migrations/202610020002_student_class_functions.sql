begin;

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
declare
  persisted_class_id text := coalesce(nullif(btrim(target_class_id), ''), 'cls-' || gen_random_uuid()::text);
  current_revision integer;
  selected_student_count integer := coalesce(array_length(student_ids, 1), 0);
  schedule_row jsonb;
begin
  if not private.has_organization_wide_permission(target_organization_id, 'classes.manage') then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if nullif(btrim(class_name), '') is null or nullif(btrim(class_code), '') is null then
    raise exception using errcode = '23514', message = 'INVALID_CLASS';
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

  select c.revision into current_revision
  from public.course_classes c
  where c.id = persisted_class_id and c.organization_id = target_organization_id
  for update;

  if found then
    if expected_revision is null or current_revision <> expected_revision then
      raise exception using errcode = '40001', message = 'REVISION_CONFLICT';
    end if;
    update public.course_classes c set
      name = btrim(class_name), code = upper(btrim(class_code)),
      class_type = requested_class_type, capacity = class_capacity,
      status = requested_class_status, revision = c.revision + 1
    where c.id = persisted_class_id and c.organization_id = target_organization_id
    returning c.revision into current_revision;
  else
    if target_class_id is not null or expected_revision is not null then
      raise exception using errcode = 'P0002', message = 'CLASS_NOT_FOUND';
    end if;
    insert into public.course_classes
      (id, organization_id, name, code, class_type, capacity, status, revision)
    values
      (persisted_class_id, target_organization_id, btrim(class_name), upper(btrim(class_code)),
       requested_class_type, class_capacity, requested_class_status, 1)
    returning course_classes.revision into current_revision;
  end if;

  delete from public.class_subjects where class_subjects.class_id = persisted_class_id;
  insert into public.class_subjects (organization_id, class_id, subject_code, position)
  select target_organization_id, persisted_class_id, value, ordinality - 1
  from unnest(coalesce(subject_codes, array[]::text[])) with ordinality as subjects(value, ordinality);

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

create or replace function public.save_student_aggregate(
  target_organization_id text,
  target_student_id text,
  expected_revision integer,
  requested_student_number text,
  student_name text,
  student_gender text,
  requested_student_status text,
  student_phone text,
  class_ids text[]
)
returns table (student_id text, revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  persisted_student_id text := coalesce(nullif(btrim(target_student_id), ''), 'stu-' || gen_random_uuid()::text);
  current_revision integer;
begin
  if not private.has_organization_wide_permission(target_organization_id, 'students.manage') then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if class_ids is not null and not private.has_organization_wide_permission(target_organization_id, 'classes.manage') then
    raise exception using errcode = '42501', message = 'CLASS_MANAGEMENT_FORBIDDEN';
  end if;
  if exists (
    select 1 from unnest(coalesce(class_ids, array[]::text[])) requested_class_id
    where not exists (
      select 1 from public.course_classes c
      where c.id = requested_class_id and c.organization_id = target_organization_id
        and c.status <> 'archived'
    )
  ) then
    raise exception using errcode = '23503', message = 'INVALID_CLASS';
  end if;
  if exists (
    select 1 from unnest(coalesce(class_ids, array[]::text[])) requested_class_id
    join public.course_classes c on c.id = requested_class_id
    where c.capacity is not null
      and (select count(*) from public.class_enrollments ce
           where ce.class_id = c.id and ce.status = 'active'
             and ce.student_id <> persisted_student_id) >= c.capacity
  ) then
    raise exception using errcode = '23514', message = 'CAPACITY_EXCEEDED';
  end if;

  select s.revision into current_revision from public.students s
  where s.id = persisted_student_id and s.organization_id = target_organization_id for update;
  if found then
    if expected_revision is null or current_revision <> expected_revision then
      raise exception using errcode = '40001', message = 'REVISION_CONFLICT';
    end if;
    update public.students s set student_number = upper(btrim(requested_student_number)),
      display_name = btrim(student_name), gender = student_gender, status = requested_student_status,
      revision = s.revision + 1
    where s.id = persisted_student_id and s.organization_id = target_organization_id
    returning s.revision into current_revision;
  else
    if target_student_id is not null or expected_revision is not null then
      raise exception using errcode = 'P0002', message = 'STUDENT_NOT_FOUND';
    end if;
    insert into public.students
      (id, organization_id, student_number, display_name, gender, status, revision)
    values (persisted_student_id, target_organization_id, upper(btrim(requested_student_number)),
      btrim(student_name), student_gender, requested_student_status, 1)
    returning students.revision into current_revision;
  end if;

  insert into public.student_profiles (student_id, organization_id, phone)
  values (persisted_student_id, target_organization_id, btrim(student_phone))
  on conflict (student_id) do update
    set phone = excluded.phone, revision = student_profiles.revision + 1;

  if class_ids is not null then
    update public.class_enrollments set status = 'withdrawn', withdrawn_at = now()
    where class_enrollments.student_id = persisted_student_id
      and class_enrollments.status = 'active'
      and not (class_enrollments.class_id = any(class_ids));
    insert into public.class_enrollments (organization_id, class_id, student_id, status)
    select target_organization_id, requested_class_id, persisted_student_id, 'active'
    from unnest(class_ids) requested_class_id
    on conflict (class_id, student_id) do update
      set status = 'active', withdrawn_at = null, revision = class_enrollments.revision + 1;
  end if;
  return query select persisted_student_id, current_revision;
end;
$$;

create or replace function public.change_student_lifecycle(
  target_organization_id text,
  target_student_id text,
  expected_revision integer,
  lifecycle_intent text,
  lifecycle_reason text default null
)
returns table (student_id text, revision integer, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare current_revision integer;
begin
  if not private.has_organization_wide_permission(target_organization_id, 'students.manage') then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  select s.revision into current_revision from public.students s
  where s.id = target_student_id and s.organization_id = target_organization_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'STUDENT_NOT_FOUND'; end if;
  if current_revision <> expected_revision then
    raise exception using errcode = '40001', message = 'REVISION_CONFLICT';
  end if;
  if lifecycle_intent = 'archive' then
    if length(btrim(coalesce(lifecycle_reason, ''))) < 2 then
      raise exception using errcode = '23514', message = 'ARCHIVE_REASON_REQUIRED';
    end if;
    update public.students set status = 'archived', archived_at = now(),
      archived_by_profile_id = private.current_profile_id(), archive_reason = btrim(lifecycle_reason),
      revision = students.revision + 1 where id = target_student_id;
    update public.class_enrollments set status = 'withdrawn', withdrawn_at = now()
    where class_enrollments.student_id = target_student_id and status = 'active';
  elsif lifecycle_intent = 'restore' then
    update public.students set status = 'leave', archived_at = null,
      archived_by_profile_id = null, archive_reason = null, revision = students.revision + 1
    where id = target_student_id and status = 'archived';
    if not found then raise exception using errcode = '23514', message = 'STUDENT_NOT_ARCHIVED'; end if;
  else
    raise exception using errcode = '23514', message = 'INVALID_LIFECYCLE_INTENT';
  end if;
  return query select s.id, s.revision, s.status from public.students s
  where s.id = target_student_id and s.organization_id = target_organization_id;
end;
$$;

revoke all on function public.save_class_aggregate(text, text, integer, text, text, text, integer, text, text[], text[], text, jsonb, text[]) from public;
revoke all on function public.save_student_aggregate(text, text, integer, text, text, text, text, text, text[]) from public;
revoke all on function public.change_student_lifecycle(text, text, integer, text, text) from public;
grant execute on function public.save_class_aggregate(text, text, integer, text, text, text, integer, text, text[], text[], text, jsonb, text[]) to authenticated;
grant execute on function public.save_student_aggregate(text, text, integer, text, text, text, text, text, text[]) to authenticated;
grant execute on function public.change_student_lifecycle(text, text, integer, text, text) to authenticated;

commit;
