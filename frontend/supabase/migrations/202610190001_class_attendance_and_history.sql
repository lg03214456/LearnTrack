begin;

-- Requires 202610100001_class_session_functions.sql. No historical data is deleted.
alter table public.attendance_records add column if not exists arrived_at timestamptz;
alter table public.attendance_records drop constraint if exists attendance_arrival_only_when_late;
alter table public.attendance_records add constraint attendance_arrival_only_when_late
  check (arrived_at is null or status = 'late');

create or replace function public.open_class_daily_workspace_v2(
  target_organization_id text, target_class_id text, target_date date
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  workspace jsonb;
  entry jsonb;
  member jsonb;
  metadata jsonb;
  attendance jsonb;
  history jsonb := '[]'::jsonb;
  roster jsonb := '[]'::jsonb;
begin
  -- The original RPC retains progress authorization, roster snapshot and student scope.
  workspace := public.open_class_daily_workspace(target_organization_id, target_class_id, target_date);
  if workspace is null then return null; end if;
  for entry in select value from jsonb_array_elements(workspace->'history') loop
    select jsonb_strip_nulls(jsonb_build_object(
      'studyPlanId', p.study_plan_id, 'versionId', sp.version_id,
      'versionLabel', '版本 ' || v.version_number, 'learningItemId', p.learning_item_id,
      'itemPosition', i.position
    )) into metadata
    from public.student_session_progress p
    left join public.study_plans sp on sp.id = p.study_plan_id and sp.organization_id = p.organization_id
    left join public.curriculum_versions v on v.id = sp.version_id and v.organization_id = sp.organization_id
    left join public.student_learning_items i on i.id = p.learning_item_id and i.organization_id = p.organization_id
    where p.id = (entry->>'id')::uuid and p.organization_id = target_organization_id;
    history := history || jsonb_build_array(entry || coalesce(metadata, '{}'::jsonb));
  end loop;
  for member in select value from jsonb_array_elements(workspace->'members') loop
    attendance := null;
    if coalesce(private.can_access_class(target_organization_id, target_class_id, 'attendance.read'), false)
      and coalesce(private.can_access_student(target_organization_id, member->>'studentId', 'attendance.read'), false) then
      select jsonb_strip_nulls(jsonb_build_object('id', a.id, 'status', a.status,
        'arrivedAt', a.arrived_at, 'recordedAt', a.recorded_at, 'revision', a.revision)) into attendance
      from public.attendance_records a
      where a.organization_id = target_organization_id
        and a.class_session_id = nullif(workspace->'session'->>'id', '')::uuid
        and a.session_member_id = (member->>'id')::uuid and a.student_id = member->>'studentId'
        and not exists (select 1 from public.attendance_records newer where newer.supersedes_id = a.id)
      order by a.revision desc, a.id limit 1;
    end if;
    roster := roster || jsonb_build_array(member || jsonb_build_object(
      'attendanceStatus', coalesce(attendance->>'status', 'pending'), 'attendance', attendance,
      'history', coalesce((select jsonb_agg(h) from jsonb_array_elements(history) h
        where h->>'studentId' = member->>'studentId'), '[]'::jsonb)
    ));
  end loop;
  return workspace || jsonb_build_object('history', history, 'members', roster,
    'attendanceAvailable', true, 'canManageAttendance',
      coalesce(private.can_access_class(target_organization_id, target_class_id, 'attendance.manage'), false)
      and coalesce(private.can_access_class(target_organization_id, target_class_id, 'attendance.read'), false));
end;
$$;

create or replace function public.save_class_daily_attendance(
  target_organization_id text, command jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare
  lesson public.class_sessions%rowtype;
  previous public.attendance_records%rowtype;
  entry jsonb;
  entries jsonb := command->'entries';
  profile_id text := private.current_profile_id();
  reason text := nullif(btrim(command->>'reason'), '');
  arrival_time text;
  arrival timestamptz;
  leaf_count integer;
begin
  if profile_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into lesson from public.class_sessions
    where id = (command->>'sessionId')::uuid and organization_id = target_organization_id for update;
  if not found then raise exception 'Session unavailable' using errcode = 'P0002'; end if;
  if not coalesce(private.can_access_class(target_organization_id, lesson.class_id, 'attendance.manage'), false)
    or not coalesce(private.can_access_class(target_organization_id, lesson.class_id, 'attendance.read'), false) then
    raise exception 'Attendance denied' using errcode = '42501';
  end if;
  if lesson.revision is distinct from (command->>'sessionRevision')::integer then
    raise exception 'Session revision conflict' using errcode = '40001';
  end if;
  if entries is null or jsonb_typeof(entries) <> 'array' or jsonb_typeof(command->'reason') is distinct from 'string' then
    raise exception 'Invalid entries' using errcode = '23514';
  end if;
  if jsonb_array_length(entries) not between 1 and 200 or length(coalesce(reason, '')) > 200
    or exists (select 1 from jsonb_array_elements(entries) e group by e->>'sessionMemberId' having count(*) > 1) then
    raise exception 'Invalid batch' using errcode = '23514';
  end if;
  for entry in select value from jsonb_array_elements(entries) loop
    if not coalesce(private.can_access_student(target_organization_id, entry->>'studentId', 'attendance.manage'), false)
      or not coalesce(private.can_access_student(target_organization_id, entry->>'studentId', 'attendance.read'), false) then
      raise exception 'Student denied' using errcode = '42501';
    end if;
    if not exists (select 1 from public.class_session_members m
      where m.id = (entry->>'sessionMemberId')::uuid and m.organization_id = target_organization_id
        and m.class_session_id = lesson.id and m.student_id = entry->>'studentId') then
      raise exception 'Invalid roster member' using errcode = '23514';
    end if;
    if entry->>'status' is null or entry->>'status' not in ('present', 'late', 'leave', 'absent') then
      raise exception 'Invalid attendance status' using errcode = '23514';
    end if;
    arrival_time := nullif(entry->>'arrivalTime', '');
    arrival := null;
    if arrival_time is not null then
      if entry->>'status' <> 'late' or arrival_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
        raise exception 'Invalid arrival time' using errcode = '23514';
      end if;
      arrival := (lesson.session_date + arrival_time::time) at time zone 'Asia/Taipei';
    end if;
    select count(*) into leaf_count from public.attendance_records a
      where a.organization_id = target_organization_id and a.session_member_id = (entry->>'sessionMemberId')::uuid
      and not exists (select 1 from public.attendance_records newer where newer.supersedes_id = a.id);
    -- Legacy ambiguous branches require review, not silent deletion or guessing.
    if leaf_count > 1 then raise exception 'Ambiguous attendance history' using errcode = '40001'; end if;
    select * into previous from public.attendance_records a
      where a.organization_id = target_organization_id and a.session_member_id = (entry->>'sessionMemberId')::uuid
      and not exists (select 1 from public.attendance_records newer where newer.supersedes_id = a.id);
    if previous.id is distinct from nullif(entry->>'previousRecordId', '')::uuid then
      raise exception 'Attendance revision conflict' using errcode = '40001';
    end if;
    if (previous.id is not null or lesson.status = 'completed') and reason is null then
      raise exception 'Correction or append reason required' using errcode = '23514';
    end if;
    insert into public.attendance_records (organization_id, class_session_id, session_member_id,
      student_id, status, arrived_at, recorded_by_profile_id, recorded_at, supersedes_id, correction_reason, revision)
    values (target_organization_id, lesson.id, (entry->>'sessionMemberId')::uuid, entry->>'studentId',
      entry->>'status', arrival, profile_id, clock_timestamp(), previous.id, reason, coalesce(previous.revision, 0) + 1);
  end loop;
  update public.class_sessions set revision = revision + 1 where id = lesson.id and organization_id = target_organization_id;
end;
$$;

revoke all on function public.open_class_daily_workspace_v2(text, text, date) from public, anon;
revoke all on function public.save_class_daily_attendance(text, jsonb) from public, anon;
grant execute on function public.open_class_daily_workspace_v2(text, text, date) to authenticated;
grant execute on function public.save_class_daily_attendance(text, jsonb) to authenticated;
-- Preserve existing RLS SELECT and immutable-history triggers; prevent direct REST bypass.
revoke insert, update, delete on public.attendance_records from authenticated;
notify pgrst, 'reload schema';
commit;
