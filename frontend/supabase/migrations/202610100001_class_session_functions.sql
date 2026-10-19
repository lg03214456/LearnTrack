begin;

alter table public.student_session_progress
  add column if not exists learning_item_revision_after integer;

-- User-JWT RPCs. Definer access is gated by the existing membership/scope helpers.
-- Opening a managed classroom snapshots its roster exactly once. Read-only opening
-- never creates a session or changes its roster.
create or replace function public.open_class_daily_workspace(
  target_organization_id text, target_class_id text, target_date date
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  course public.course_classes%rowtype;
  lesson public.class_sessions%rowtype;
  may_manage boolean;
  history jsonb;
  roster jsonb;
begin
  if not coalesce(private.can_access_class(target_organization_id, target_class_id, 'progress.read'), false) then
    raise exception 'Class access denied' using errcode = '42501';
  end if;
  select * into course from public.course_classes
    where id = target_class_id and organization_id = target_organization_id;
  if not found then return null; end if;
  if target_date is null then raise exception 'Date required' using errcode = '23514'; end if;
  may_manage := coalesce(private.can_access_class(target_organization_id, target_class_id, 'progress.manage'), false);
  -- Serialize initial snapshot and avoid two open requests returning an empty roster.
  if may_manage then
    perform 1 from public.course_classes where id = course.id and organization_id = target_organization_id for update;
  end if;
  select * into lesson from public.class_sessions
    where organization_id = target_organization_id and class_id = target_class_id and session_date = target_date;
  if not found and may_manage then
    insert into public.class_sessions (organization_id, class_id, session_date)
      values (target_organization_id, target_class_id, target_date) returning * into lesson;
    insert into public.class_session_members (organization_id, class_session_id, student_id, enrollment_class_id)
      select target_organization_id, lesson.id, e.student_id, e.class_id
      from public.class_enrollments e join public.students s
        on s.id = e.student_id and s.organization_id = e.organization_id
      where e.organization_id = target_organization_id and e.class_id = target_class_id
        and e.status = 'active' and s.status <> 'archived';
  end if;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', p.id, 'studentId', p.student_id, 'studentName', s.display_name,
    'planLabel', t.name, 'learningItemTitle', i.title, 'statusAfterSession', p.status_after_session,
    'note', p.note, 'recordedAt', p.recorded_at, 'recordedBy', p.recorded_by_profile_id,
    'supersedesId', p.supersedes_id, 'correctionReason', p.correction_reason, 'revision', p.revision
  )) order by p.recorded_at desc, p.id), '[]'::jsonb) into history
  from public.student_session_progress p
  join public.students s on s.id = p.student_id and s.organization_id = p.organization_id
  left join public.study_plans sp on sp.id = p.study_plan_id and sp.organization_id = p.organization_id
  left join public.curriculum_versions v on v.id = sp.version_id and v.organization_id = sp.organization_id
  left join public.curriculum_templates t on t.id = v.template_id and t.organization_id = v.organization_id
  left join public.student_learning_items i on i.id = p.learning_item_id and i.organization_id = p.organization_id
  where p.organization_id = target_organization_id and p.class_session_id = lesson.id
    and private.can_access_student(target_organization_id, p.student_id, 'progress.read');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'studentId', s.id, 'studentName', s.display_name, 'studentNumber', s.student_number,
    'attendanceStatus', coalesce((select a.status from public.attendance_records a
      where a.organization_id = target_organization_id and a.session_member_id = m.id
        and private.can_access_student(target_organization_id, s.id, 'attendance.read')
      order by a.recorded_at desc, a.revision desc, a.id desc limit 1), 'pending'),
    'plans', plans.value, 'needsPlanSetup', jsonb_array_length(plans.value) = 0,
    'history', coalesce((select jsonb_agg(h) from jsonb_array_elements(history) h
      where h->>'studentId' = s.id), '[]'::jsonb)
  ) order by s.student_number, s.id), '[]'::jsonb) into roster
  from public.class_session_members m
  join public.students s on s.id = m.student_id and s.organization_id = m.organization_id
  cross join lateral (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', sp.id, 'label', coalesce(sub.name, sp.subject_id) || '・' || t.name,
      'versionLabel', t.publisher_id || '・版本 ' || v.version_number,
      'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', i.id, 'title', i.title, 'status', i.status, 'revision', i.revision
      ) order by i.position, i.id) from public.student_learning_items i
        where i.organization_id = target_organization_id and i.study_plan_id = sp.id
          and i.status not in ('removed', 'skipped')), '[]'::jsonb)
    ) order by sp.id), '[]'::jsonb) as value
    from public.study_plans sp
    join public.curriculum_versions v on v.id = sp.version_id and v.organization_id = sp.organization_id
    join public.curriculum_templates t on t.id = v.template_id and t.organization_id = v.organization_id
    left join public.subjects sub on sub.code = sp.subject_id and sub.organization_id = sp.organization_id
    where sp.organization_id = target_organization_id and sp.student_id = s.id
      and sp.status = 'active' and sp.deleted_at is null
  ) plans
  where m.organization_id = target_organization_id and m.class_session_id = lesson.id
    and private.can_access_student(target_organization_id, s.id, 'progress.read');

  return jsonb_build_object(
    'session', jsonb_build_object('id', coalesce(lesson.id::text, ''), 'classId', course.id,
      'className', course.name, 'classCode', coalesce(course.code, ''), 'sessionDate', target_date,
      'status', coalesce(lesson.status, 'draft'), 'revision', coalesce(lesson.revision, 1),
      'teacherName', coalesce((select string_agg(p.display_name, '、' order by p.display_name)
        from public.class_assignments ca join public.organization_memberships om
          on om.id = ca.membership_id and om.organization_id = ca.organization_id
        join public.profiles p on p.id = om.profile_id
        where ca.organization_id = target_organization_id and ca.class_id = target_class_id
          and ca.status = 'active' and om.status = 'active'), '未指派'),
      'scheduleLabel', coalesce((select string_agg(left(sc.starts_at::text, 5) || '–' ||
        left(sc.ends_at::text, 5) || case when coalesce(sc.room, '') = '' then '' else '・' || sc.room end,
        '、' order by sc.starts_at) from public.class_schedules sc
        where sc.organization_id = target_organization_id and sc.class_id = target_class_id
          and sc.weekday = extract(dow from target_date)), '當日無固定排課')),
    'members', roster, 'history', history, 'canManage', may_manage
  );
end;
$$;

-- One transaction for progress history + current learning item + lesson revision.
-- Failure at any point rolls back every write. Historical corrections append rows.
create or replace function public.mutate_class_daily_progress(
  target_organization_id text, operation text, command jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare
  lesson public.class_sessions%rowtype;
  previous public.student_session_progress%rowtype;
  item public.student_learning_items%rowtype;
  entry jsonb;
  entries jsonb;
  reason text := nullif(btrim(command->>'reason'), '');
  profile_id text := private.current_profile_id();
  session_id uuid;
begin
  if profile_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if operation not in ('save', 'append', 'complete', 'correct') or operation is null then
    raise exception 'Invalid operation' using errcode = '23514';
  end if;
  if operation = 'correct' then
    select * into previous from public.student_session_progress
      where id = (command->>'progressId')::uuid and organization_id = target_organization_id;
    if not found then raise exception 'Progress not found' using errcode = 'P0002'; end if;
    session_id := previous.class_session_id;
  else
    session_id := (command->>'sessionId')::uuid;
  end if;
  select * into lesson from public.class_sessions
    where id = session_id and organization_id = target_organization_id for update;
  if not found then raise exception 'Session not found' using errcode = 'P0002'; end if;
  if not coalesce(private.can_access_class(target_organization_id, lesson.class_id, 'progress.manage'), false) then
    raise exception 'Class mutation denied' using errcode = '42501';
  end if;
  if operation <> 'correct' and lesson.revision is distinct from (command->>'sessionRevision')::integer then
    raise exception 'Session revision conflict' using errcode = '40001';
  end if;
  if operation = 'complete' then
    if lesson.status <> 'draft' then raise exception 'Session already completed' using errcode = '40001'; end if;
    update public.class_sessions set status = 'completed', completed_at = now(), revision = revision + 1
      where id = lesson.id and organization_id = target_organization_id;
    return;
  end if;
  if operation in ('append', 'correct') and (reason is null or length(reason) > 200) then
    raise exception 'Reason required' using errcode = '23514';
  end if;
  if operation = 'save' and lesson.status <> 'draft' or operation = 'append' and lesson.status <> 'completed' then
    raise exception 'Session state conflict' using errcode = '40001';
  end if;
  if operation = 'correct' then
    if previous.revision is distinct from (command->>'revision')::integer or exists (
      select 1 from public.student_session_progress p where p.supersedes_id = previous.id
    ) then raise exception 'Progress already corrected' using errcode = '40001'; end if;
    entries := jsonb_build_array(jsonb_build_object(
      'sessionMemberId', previous.session_member_id, 'studentId', previous.student_id,
      'studyPlanId', previous.study_plan_id, 'learningItemId', previous.learning_item_id,
      'status', command->>'status', 'note', command->>'note'
    ));
  else
    entries := command->'entries';
  end if;
  if entries is null or jsonb_typeof(entries) <> 'array' then
    raise exception 'Invalid entries' using errcode = '23514';
  end if;
  if jsonb_array_length(entries) > 200 or (operation = 'append' and jsonb_array_length(entries) = 0) or exists (
    select 1 from jsonb_array_elements(entries) e group by e->>'learningItemId' having count(*) > 1
  ) then raise exception 'Invalid entry count' using errcode = '23514'; end if;
  -- Consistent lock ordering for concurrent classes sharing a student's plan.
  for entry in select e from jsonb_array_elements(entries) e order by e->>'learningItemId' loop
    if not coalesce(private.can_access_student(target_organization_id, entry->>'studentId', 'progress.manage'), false) then
      raise exception 'Student mutation denied' using errcode = '42501';
    end if;
    if not exists (select 1 from public.class_session_members m
      where m.id = (entry->>'sessionMemberId')::uuid and m.organization_id = target_organization_id
        and m.class_session_id = lesson.id and m.student_id = entry->>'studentId'
        and m.enrollment_class_id = lesson.class_id) or not exists (
      select 1 from public.study_plans sp where sp.id = entry->>'studyPlanId'
        and sp.organization_id = target_organization_id and sp.student_id = entry->>'studentId'
        and sp.status = 'active' and sp.deleted_at is null
    ) then raise exception 'Invalid student plan relationship' using errcode = '23514'; end if;
    -- Serialize against replacement/archive of the plan before updating any item.
    perform 1 from public.study_plans sp where sp.id = entry->>'studyPlanId'
      and sp.organization_id = target_organization_id and sp.status = 'active' and sp.deleted_at is null for share;
    if not found then raise exception 'Plan changed' using errcode = '40001'; end if;
    select * into item from public.student_learning_items i where i.id = entry->>'learningItemId'
      and i.organization_id = target_organization_id and i.study_plan_id = entry->>'studyPlanId' for update;
    if not found or item.status in ('removed', 'skipped') or
      coalesce(entry->>'status', '') not in ('pending', 'in_progress', 'completed') or
      length(coalesce(entry->>'note', '')) > 300 then
      raise exception 'Invalid learning item' using errcode = '23514';
    end if;
    if operation <> 'correct' and item.revision is distinct from (entry->>'learningItemRevision')::integer then
      raise exception 'Learning item revision conflict' using errcode = '40001';
    end if;
    if operation = 'correct' and (
      item.revision is distinct from previous.learning_item_revision_after or
      item.status <> previous.status_after_session or item.note <> previous.note or exists (
        select 1 from public.student_session_progress p
          where p.organization_id = target_organization_id and p.learning_item_id = item.id
            and p.id <> previous.id and p.recorded_at >= previous.recorded_at
      )
    ) then raise exception 'Newer progress exists' using errcode = '40001'; end if;
    insert into public.student_session_progress (
      organization_id, class_session_id, session_member_id, student_id, study_plan_id, learning_item_id,
      status_after_session, note, recorded_by_profile_id, supersedes_id, correction_reason, revision,
      learning_item_revision_after, recorded_at
    ) values (
      target_organization_id, lesson.id, (entry->>'sessionMemberId')::uuid, entry->>'studentId',
      entry->>'studyPlanId', item.id, entry->>'status', btrim(coalesce(entry->>'note', '')), profile_id,
      case when operation = 'correct' then previous.id end, reason,
      case when operation = 'correct' then previous.revision + 1 else 1 end,
      item.revision + 1, clock_timestamp()
    );
    update public.student_learning_items set status = entry->>'status',
      note = btrim(coalesce(entry->>'note', '')), revision = revision + 1, updated_at = now(),
      completed_at = case when entry->>'status' = 'completed' then coalesce(completed_at, now()) end
      where id = item.id and organization_id = target_organization_id;
  end loop;
  update public.class_sessions set revision = revision + 1
    where id = lesson.id and organization_id = target_organization_id;
end;
$$;

revoke all on function public.open_class_daily_workspace(text, text, date) from public, anon;
revoke all on function public.mutate_class_daily_progress(text, text, jsonb) from public, anon;
grant execute on function public.open_class_daily_workspace(text, text, date) to authenticated;
grant execute on function public.mutate_class_daily_progress(text, text, jsonb) to authenticated;

-- Only checked RPCs may mutate session aggregates; direct REST writes cannot bypass
-- the revision/relationship/transaction checks above.
revoke insert, update, delete on public.class_sessions, public.class_session_members,
  public.student_session_progress from authenticated;

create or replace function private.reject_classroom_history_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Classroom history is append-only' using errcode = '42501';
end;
$$;
drop trigger if exists student_session_progress_append_only on public.student_session_progress;
create trigger student_session_progress_append_only before update or delete on public.student_session_progress
  for each row execute function private.reject_classroom_history_change();
drop trigger if exists attendance_records_append_only on public.attendance_records;
create trigger attendance_records_append_only before update or delete on public.attendance_records
  for each row execute function private.reject_classroom_history_change();
revoke all on function private.reject_classroom_history_change() from public, anon, authenticated;

commit;
