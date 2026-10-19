-- Apply after 202610070001_curriculum_study_plan_lifecycle.sql.
-- No demonstration templates/students are inserted. Existing classification codes remain compatible.
begin;

create or replace function public.read_curriculum_workspace(
  target_organization_id text, target_version_id text default null, target_student_id text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  workspace jsonb;
  selected_version_ids text[];
begin
  if target_student_id is null then
    if not coalesce(private.has_permission(target_organization_id, 'curriculum.read'), false) then
      raise exception using errcode = '42501', message = 'FORBIDDEN';
    end if;
  elsif not coalesce(private.can_access_student(target_organization_id, target_student_id, 'study_plans.read'), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select coalesce(array_agg(v.id), '{}'::text[]) into selected_version_ids
  from public.curriculum_versions v
  join public.curriculum_templates t on t.id = v.template_id and t.organization_id = v.organization_id
  where v.organization_id = target_organization_id and (
    (target_student_id is null and (target_version_id is null or v.id = target_version_id))
    or (target_student_id is not null and (
      (v.status = 'published' and t.archived_at is null
       and private.can_access_student(target_organization_id, target_student_id, 'study_plans.manage'))
      or exists (select 1 from public.study_plans p where p.organization_id = target_organization_id
        and p.student_id = target_student_id and p.version_id = v.id and p.deleted_at is null)
    ))
  );

  select jsonb_build_object(
    -- Existing UI classification catalog, not Mock records. Editable reference catalogs are a later phase.
    'grades', '[{"id":"g7","name":"國一"},{"id":"g8","name":"國二"},{"id":"g9","name":"國三"}]'::jsonb,
    'publishers', '[{"id":"hanlin","name":"翰林"},{"id":"kanghsuan","name":"康軒"},{"id":"custom","name":"自編教材"}]'::jsonb,
    'terms', '[{"id":"115-1","name":"115-1"},{"id":"115-2","name":"115-2"}]'::jsonb,
    'subjects', coalesce((select jsonb_agg(jsonb_build_object('id', s.code, 'name', s.name) order by s.position, s.code)
      from public.subjects s where s.organization_id = target_organization_id), '[]'::jsonb),
    'templates', coalesce((select jsonb_agg(jsonb_build_object(
      'id', t.id, 'organizationId', t.organization_id, 'name', t.name, 'gradeId', t.grade_id,
      'subjectId', t.subject_id, 'publisherId', t.publisher_id, 'isArchived', t.archived_at is not null) order by t.created_at desc, t.id)
      from public.curriculum_templates t where t.organization_id = target_organization_id
      and (target_student_id is null and target_version_id is null or exists (
        select 1 from public.curriculum_versions v where v.template_id = t.id
        and v.organization_id = target_organization_id and v.id = any(selected_version_ids)))), '[]'::jsonb),
    'versions', coalesce((select jsonb_agg(jsonb_build_object(
      'id', v.id, 'organizationId', v.organization_id, 'templateId', v.template_id,
      'number', v.version_number, 'status', v.status, 'revision', v.revision))
      from public.curriculum_versions v where v.organization_id = target_organization_id
      and v.id = any(selected_version_ids)), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', i.id, 'organizationId', i.organization_id, 'versionId', i.version_id,
      'lineageId', i.lineage_id, 'parentId', i.parent_id, 'type', i.item_type,
      'title', i.title, 'position', i.position)) order by i.position, i.id)
      from public.curriculum_items i where i.organization_id = target_organization_id
      and target_student_id is null and i.version_id = any(selected_version_ids)), '[]'::jsonb),
    'plans', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', p.id, 'organizationId', p.organization_id, 'studentId', p.student_id,
      'termId', p.term_id, 'gradeId', p.grade_id, 'subjectId', p.subject_id, 'versionId', p.version_id,
      'status', p.status, 'revision', p.revision, 'replacedAt', p.replaced_at, 'completedAt', p.completed_at)) order by p.created_at desc, p.id)
      from public.study_plans p where p.organization_id = target_organization_id
      and p.student_id = target_student_id and p.deleted_at is null), '[]'::jsonb),
    'learningItems', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', i.id, 'organizationId', i.organization_id, 'planId', i.study_plan_id,
      'sourceItemId', i.source_item_id, 'lineageId', i.lineage_id, 'type', i.item_type,
      'title', i.title, 'position', i.position, 'status', i.status, 'isCustom', i.is_custom,
      'revision', i.revision, 'completedAt', i.completed_at, 'removedAt', i.removed_at,
      'removedReason', i.removed_reason, 'carriedFromItemId', i.carried_from_item_id)) order by i.position, i.id)
      from public.student_learning_items i join public.study_plans p
        on p.id = i.study_plan_id and p.organization_id = i.organization_id
      where i.organization_id = target_organization_id and p.student_id = target_student_id
      and p.deleted_at is null), '[]'::jsonb),
    'students', coalesce((select jsonb_agg(jsonb_build_object(
      'id', s.id, 'organizationId', s.organization_id, 'name', s.display_name, 'number', s.student_number))
      from public.students s where s.organization_id = target_organization_id and s.id = target_student_id), '[]'::jsonb),
    'enrollments', coalesce((select jsonb_agg(jsonb_build_object(
      'organizationId', e.organization_id, 'studentId', e.student_id, 'classId', e.class_id, 'status', e.status))
      from public.class_enrollments e where e.organization_id = target_organization_id
      and e.student_id = target_student_id and e.status = 'active'), '[]'::jsonb)
  ) into workspace;
  return workspace;
end;
$$;

-- Correct the previous unique-active-plan violation: close old plan before inserting the new one.
create or replace function public.replace_student_study_plan(
  target_organization_id text, target_student_id text, target_term_id text, target_version_id text
) returns table (study_plan_id text, replaced_plan_id text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  selected_version public.curriculum_versions%rowtype;
  selected_template public.curriculum_templates%rowtype;
  current_plan public.study_plans%rowtype;
  created_plan_id text := 'plan-' || gen_random_uuid()::text;
  changed_at timestamptz := clock_timestamp();
begin
  if not coalesce(private.can_access_student(target_organization_id, target_student_id, 'study_plans.manage'), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if target_term_id is null or target_term_id not in ('115-1', '115-2') then
    raise exception using errcode = '23514', message = 'INVALID_TERM';
  end if;
  -- Serialize initial activation as well as replacement (no active plan may exist yet).
  perform 1 from public.students s where s.id = target_student_id and s.organization_id = target_organization_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'STUDENT_NOT_FOUND'; end if;
  select t.* into selected_template from public.curriculum_templates t
  join public.curriculum_versions v on v.template_id = t.id and v.organization_id = t.organization_id
  where v.id = target_version_id and v.organization_id = target_organization_id
  and t.archived_at is null for update of t;
  if not found then raise exception using errcode = 'P0002', message = 'TEMPLATE_NOT_FOUND'; end if;
  select v.* into selected_version from public.curriculum_versions v
  where v.id = target_version_id and v.organization_id = target_organization_id and v.status = 'published';
  if not found then raise exception using errcode = '23514', message = 'PUBLISHED_VERSION_REQUIRED'; end if;
  if not exists (select 1 from public.curriculum_items i where i.organization_id = target_organization_id and i.version_id = target_version_id) then
    raise exception using errcode = '23514', message = 'EMPTY_VERSION';
  end if;
  select p.* into current_plan from public.study_plans p
  where p.organization_id = target_organization_id and p.student_id = target_student_id
  and p.term_id = target_term_id and p.subject_id = selected_template.subject_id
  and p.status = 'active' and p.deleted_at is null for update;
  if current_plan.version_id = target_version_id then
    raise exception using errcode = '23505', message = 'STUDY_PLAN_ALREADY_ACTIVE';
  end if;
  perform 1 from public.student_learning_items i where i.organization_id = target_organization_id
    and i.study_plan_id = current_plan.id order by i.id for update;
  if current_plan.id is not null then
    update public.study_plans p set status = 'replaced', replaced_at = changed_at,
      revision = p.revision + 1, updated_at = changed_at
    where p.id = current_plan.id and p.organization_id = target_organization_id;
  end if;
  insert into public.study_plans (id, organization_id, student_id, term_id, grade_id, subject_id, version_id, status)
  values (created_plan_id, target_organization_id, target_student_id, target_term_id,
    selected_template.grade_id, selected_template.subject_id, target_version_id, 'active');
  insert into public.student_learning_items (id, organization_id, study_plan_id, source_item_id, lineage_id,
    item_type, title, position, status, completed_at, carried_from_item_id)
  select 'learn-' || gen_random_uuid()::text, target_organization_id, created_plan_id, i.id, i.lineage_id,
    i.item_type, i.title, i.position, case when c.id is not null then 'completed' else 'pending' end,
    c.completed_at, c.id
  from public.curriculum_items i left join public.student_learning_items c
    on c.organization_id = target_organization_id and c.study_plan_id = current_plan.id
    and c.lineage_id = i.lineage_id and c.status = 'completed'
  where i.organization_id = target_organization_id and i.version_id = target_version_id;
  if current_plan.id is not null then
    update public.student_learning_items i set status = 'removed', removed_at = changed_at,
      removed_reason = '修課計畫已更換', revision = i.revision + 1, updated_at = changed_at
    where i.organization_id = target_organization_id and i.study_plan_id = current_plan.id
      and i.status not in ('completed', 'removed');
    update public.study_plans p set replaced_by_plan_id = created_plan_id
    where p.id = current_plan.id and p.organization_id = target_organization_id;
  end if;
  return query select created_plan_id, current_plan.id;
end;
$$;

create or replace function public.mutate_curriculum_workspace(
  target_organization_id text, operation text, command jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  selected_template public.curriculum_templates%rowtype;
  selected_version public.curriculum_versions%rowtype;
  selected_item public.curriculum_items%rowtype;
  selected_learning_item public.student_learning_items%rowtype;
  selected_plan public.study_plans%rowtype;
  created_id text;
  version_id text := command->>'versionId';
  item_id text := command->>'itemId';
  parent_id text := nullif(command->>'parentId', '');
  item_title text := btrim(command->>'title');
  item_type text := command->>'type';
  expected_revision integer := (command->>'revision')::integer;
  ordered_ids text[];
  old_ids text[];
  mapped_ids jsonb := '{}'::jsonb;
  row_item public.curriculum_items%rowtype;
  item_index integer;
  offset_position integer;
  swapped_id text;
  changed_at timestamptz := clock_timestamp();
begin
  if operation is null or operation not in ('create', 'publish', 'copy', 'archive', 'addItem', 'updateItem', 'deleteItem', 'moveItem', 'reorder', 'replacePlan', 'adjustItem') then
    raise exception using errcode = '23514', message = 'INVALID_OPERATION';
  end if;
  if operation in ('replacePlan', 'adjustItem') then
    if not coalesce(private.has_permission(target_organization_id, 'study_plans.manage'), false) then
      raise exception using errcode = '42501', message = 'FORBIDDEN';
    end if;
  elsif not coalesce(private.has_permission(target_organization_id, 'curriculum.manage'), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  if operation = 'replacePlan' then
    select p.study_plan_id into created_id from public.replace_student_study_plan(
      target_organization_id, command->>'studentId', command->>'termId', version_id) p;
    return jsonb_build_object('id', created_id);
  elsif operation = 'adjustItem' then
    -- Same lock order as replacement: plan, then item. Scope is rechecked against the persisted student.
    select p.* into selected_plan from public.study_plans p
    join public.student_learning_items i on i.study_plan_id = p.id and i.organization_id = p.organization_id
    where i.id = item_id and p.organization_id = target_organization_id for update of p;
    if not found then raise exception using errcode = 'P0002', message = 'ITEM_NOT_FOUND'; end if;
    if not coalesce(private.can_access_student(target_organization_id, selected_plan.student_id, 'study_plans.manage'), false) then
      raise exception using errcode = '42501', message = 'FORBIDDEN';
    end if;
    select i.* into selected_learning_item from public.student_learning_items i
    where i.id = item_id and i.organization_id = target_organization_id for update;
    if selected_plan.status <> 'active' or selected_plan.deleted_at is not null or selected_learning_item.status = 'removed' then
      raise exception using errcode = '40001', message = 'INACTIVE_PLAN';
    end if;
    if expected_revision is null or expected_revision <> selected_learning_item.revision then
      raise exception using errcode = '40001', message = 'STALE_REVISION';
    end if;
    if command->>'status' is null or command->>'status' not in ('pending', 'in_progress', 'completed', 'skipped')
      or (command ? 'title' and coalesce(length(item_title), 0) = 0) then
      raise exception using errcode = '23514', message = 'INVALID_LEARNING_ITEM';
    end if;
    update public.student_learning_items i set title = coalesce(item_title, i.title), status = command->>'status',
      completed_at = case when command->>'status' = 'completed' then coalesce(i.completed_at, changed_at) else null end,
      revision = i.revision + 1, updated_at = changed_at
    where i.id = item_id and i.organization_id = target_organization_id;
    return jsonb_build_object('id', item_id);
  elsif operation = 'create' then
    if coalesce(length(btrim(command->>'name')), 0) = 0
      or command->>'gradeId' is null or command->>'gradeId' not in ('g7', 'g8', 'g9')
      or command->>'publisherId' is null or command->>'publisherId' not in ('hanlin', 'kanghsuan', 'custom')
      or not exists (select 1 from public.subjects s where s.organization_id = target_organization_id
        and s.code = command->>'subjectId' and s.status = 'active') then
      raise exception using errcode = '23514', message = 'INVALID_CLASSIFICATION';
    end if;
    -- Serialize natural-name checks without a destructive new unique constraint on existing data.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_organization_id || ':curriculum:' || btrim(command->>'name'), 0));
    if exists (select 1 from public.curriculum_templates t where t.organization_id = target_organization_id
      and t.name = btrim(command->>'name') and t.archived_at is null) then
      raise exception using errcode = '23505', message = 'DUPLICATE_TEMPLATE';
    end if;
    created_id := 'tpl-' || gen_random_uuid()::text;
    insert into public.curriculum_templates (id, organization_id, name, grade_id, subject_id, publisher_id)
    values (created_id, target_organization_id, btrim(command->>'name'), command->>'gradeId', command->>'subjectId', command->>'publisherId');
    version_id := 'ver-' || gen_random_uuid()::text;
    insert into public.curriculum_versions (id, organization_id, template_id, version_number)
    values (version_id, target_organization_id, created_id, 1);
    return jsonb_build_object('id', version_id);
  end if;

  select t.* into selected_template from public.curriculum_templates t
  where t.organization_id = target_organization_id and (
    operation = 'archive' and t.id = command->>'templateId'
    or operation <> 'archive' and exists (select 1 from public.curriculum_versions v
      where v.id = version_id and v.organization_id = target_organization_id and v.template_id = t.id)
  ) for update;
  if not found then raise exception using errcode = 'P0002', message = 'TEMPLATE_NOT_FOUND'; end if;
  if operation = 'archive' then
    update public.curriculum_templates t set archived_at = coalesce(t.archived_at, changed_at), updated_at = changed_at
    where t.id = selected_template.id and t.organization_id = target_organization_id;
    return jsonb_build_object('id', selected_template.id);
  end if;
  if selected_template.archived_at is not null then
    raise exception using errcode = '40001', message = 'ARCHIVED_TEMPLATE';
  end if;
  select v.* into selected_version from public.curriculum_versions v
  where v.id = version_id and v.organization_id = target_organization_id for update;
  if expected_revision is null or expected_revision <> selected_version.revision then
    raise exception using errcode = '40001', message = 'STALE_REVISION';
  end if;
  if operation <> 'copy' and selected_version.status <> 'draft' then
    raise exception using errcode = '40001', message = 'PUBLISHED_VERSION_IMMUTABLE';
  end if;
  if operation = 'publish' then
    if not exists (select 1 from public.curriculum_items i where i.organization_id = target_organization_id and i.version_id = version_id) then
      raise exception using errcode = '23514', message = 'EMPTY_VERSION';
    end if;
    update public.curriculum_versions v set status = 'published', revision = v.revision + 1, updated_at = changed_at
    where v.id = version_id and v.organization_id = target_organization_id;
    return jsonb_build_object('id', version_id);
  elsif operation = 'copy' then
    created_id := 'ver-' || gen_random_uuid()::text;
    insert into public.curriculum_versions (id, organization_id, template_id, version_number)
    select created_id, target_organization_id, selected_template.id, coalesce(max(v.version_number), 0) + 1
    from public.curriculum_versions v where v.organization_id = target_organization_id and v.template_id = selected_template.id;
    for row_item in select i.* from public.curriculum_items i where i.organization_id = target_organization_id and i.version_id = version_id loop
      mapped_ids := mapped_ids || jsonb_build_object(row_item.id, 'item-' || gen_random_uuid()::text);
    end loop;
    insert into public.curriculum_items (id, organization_id, version_id, lineage_id, item_type, title, position)
    select mapped_ids->>i.id, target_organization_id, created_id, i.lineage_id, i.item_type, i.title, i.position
    from public.curriculum_items i where i.organization_id = target_organization_id and i.version_id = version_id;
    update public.curriculum_items n set parent_id = mapped_ids->>o.parent_id
    from public.curriculum_items o where o.organization_id = target_organization_id and o.version_id = version_id
    and n.organization_id = target_organization_id and n.version_id = created_id and n.id = mapped_ids->>o.id;
    return jsonb_build_object('id', created_id);
  end if;

  select coalesce(array_agg(i.id order by i.position, i.id), '{}'::text[]) into old_ids
  from public.curriculum_items i where i.organization_id = target_organization_id and i.version_id = version_id;
  if operation in ('updateItem', 'deleteItem', 'moveItem') then
    select i.* into selected_item from public.curriculum_items i
    where i.organization_id = target_organization_id and i.version_id = version_id and i.id = item_id;
    if not found then raise exception using errcode = 'P0002', message = 'ITEM_NOT_FOUND'; end if;
  end if;
  if operation in ('addItem', 'updateItem') then
    if coalesce(length(item_title), 0) = 0 or item_type is null
      or item_type not in ('chapter', 'unit', 'material', 'worksheet', 'assessment') then
      raise exception using errcode = '23514', message = 'INVALID_ITEM';
    end if;
    if parent_id is not null and (parent_id = item_id or not exists (
      select 1 from public.curriculum_items p where p.organization_id = target_organization_id
      and p.version_id = version_id and p.id = parent_id and p.parent_id is null
    ) or exists (select 1 from public.curriculum_items c where c.organization_id = target_organization_id
      and c.version_id = version_id and c.parent_id = item_id)) then
      raise exception using errcode = '23514', message = 'INVALID_PARENT';
    end if;
    if operation = 'addItem' then
      created_id := 'item-' || gen_random_uuid()::text;
      insert into public.curriculum_items (id, organization_id, version_id, lineage_id, parent_id, item_type, title, position)
      select created_id, target_organization_id, version_id, created_id, parent_id, item_type, item_title,
        coalesce(max(i.position), -1) + 1 from public.curriculum_items i
      where i.organization_id = target_organization_id and i.version_id = version_id;
    else
      update public.curriculum_items i set title = item_title, item_type = item_type,
        parent_id = parent_id, updated_at = changed_at
      where i.organization_id = target_organization_id and i.version_id = version_id and i.id = item_id;
    end if;
  else
    ordered_ids := old_ids;
    if operation = 'deleteItem' then
      -- Children first, respecting the immediate restrictive parent FK.
      delete from public.curriculum_items i where i.organization_id = target_organization_id and i.version_id = version_id and i.parent_id = item_id;
      delete from public.curriculum_items i where i.organization_id = target_organization_id and i.version_id = version_id and i.id = item_id;
      select coalesce(array_agg(i.id order by i.position, i.id), '{}'::text[]) into ordered_ids
      from public.curriculum_items i where i.organization_id = target_organization_id and i.version_id = version_id;
    elsif operation = 'moveItem' then
      item_index := array_position(old_ids, item_id);
      if command->>'direction' = 'up' then offset_position := item_index - 1;
      elsif command->>'direction' = 'down' then offset_position := item_index + 1;
      else raise exception using errcode = '23514', message = 'INVALID_DIRECTION'; end if;
      if offset_position < 1 or offset_position > cardinality(old_ids) then
        raise exception using errcode = '23514', message = 'MOVE_OUT_OF_BOUNDS';
      end if;
      swapped_id := ordered_ids[offset_position];
      ordered_ids[offset_position] := item_id;
      ordered_ids[item_index] := swapped_id;
    else
      if jsonb_typeof(command->'orderedItemIds') is distinct from 'array' then
        raise exception using errcode = '23514', message = 'INVALID_ORDER';
      end if;
      select coalesce(array_agg(x.value order by x.ordinality), '{}'::text[]) into ordered_ids
      from jsonb_array_elements_text(command->'orderedItemIds') with ordinality x(value, ordinality);
      if cardinality(ordered_ids) <> cardinality(old_ids)
        or (select count(distinct x) from unnest(ordered_ids) x) <> cardinality(old_ids)
        or not (ordered_ids <@ old_ids and old_ids <@ ordered_ids) then
        raise exception using errcode = '23514', message = 'INVALID_ORDER';
      end if;
    end if;
    -- Unique positions are immediate: move to a disjoint range before compacting.
    select coalesce(max(i.position), -1) + 1 into offset_position from public.curriculum_items i
    where i.organization_id = target_organization_id and i.version_id = version_id;
    update public.curriculum_items i set position = i.position + offset_position
    where i.organization_id = target_organization_id and i.version_id = version_id;
    update public.curriculum_items i set position = x.ordinality - 1, updated_at = changed_at
    from unnest(ordered_ids) with ordinality x(id, ordinality)
    where i.organization_id = target_organization_id and i.version_id = version_id and i.id = x.id;
  end if;
  update public.curriculum_versions v set revision = v.revision + 1, updated_at = changed_at
  where v.id = version_id and v.organization_id = target_organization_id;
  return jsonb_build_object('id', coalesce(created_id, item_id, version_id));
end;
$$;

-- All tenant writes now go through guarded atomic functions, not direct REST table mutation.
revoke insert, update, delete on public.curriculum_templates, public.curriculum_versions,
  public.curriculum_items, public.study_plans, public.student_learning_items from authenticated;
revoke all on function public.read_curriculum_workspace(text, text, text) from public, anon;
revoke all on function public.mutate_curriculum_workspace(text, text, jsonb) from public, anon;
grant execute on function public.read_curriculum_workspace(text, text, text) to authenticated;
grant execute on function public.mutate_curriculum_workspace(text, text, jsonb) to authenticated;
revoke all on function public.replace_student_study_plan(text, text, text, text) from public, anon;
grant execute on function public.replace_student_study_plan(text, text, text, text) to authenticated;

commit;
notify pgrst, 'reload schema';
