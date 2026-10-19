-- Additive migration. Prerequisite: curriculum lifecycle schema and student permission helpers.
begin;

create unique index study_plans_exam_student_key on public.study_plans(id, organization_id, student_id);
create unique index learning_items_exam_plan_key on public.student_learning_items(id, organization_id, study_plan_id);

create table public.student_exam_ranges (
  id text primary key default ('exam-' || gen_random_uuid()::text),
  organization_id text not null,
  student_id text not null,
  name text not null check (length(btrim(name)) between 1 and 100),
  exam_date date check (exam_date is null or exam_date between date '0001-01-01' and date '9999-12-31'),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id, student_id),
  foreign key (student_id, organization_id) references public.students(id, organization_id) on delete restrict
);
create index student_exam_ranges_student_idx on public.student_exam_ranges(organization_id, student_id, created_at);

create table public.student_exam_range_items (
  organization_id text not null,
  student_id text not null,
  range_id text not null,
  study_plan_id text not null,
  learning_item_id text not null,
  primary key (range_id, learning_item_id),
  foreign key (range_id, organization_id, student_id) references public.student_exam_ranges(id, organization_id, student_id) on delete restrict,
  foreign key (study_plan_id, organization_id, student_id) references public.study_plans(id, organization_id, student_id) on delete restrict,
  foreign key (learning_item_id, organization_id, study_plan_id) references public.student_learning_items(id, organization_id, study_plan_id) on delete restrict
);
create index student_exam_range_items_student_idx on public.student_exam_range_items(organization_id, student_id);
create index student_exam_range_items_source_idx on public.student_exam_range_items(learning_item_id, organization_id, study_plan_id);
create index student_exam_range_items_plan_idx on public.student_exam_range_items(study_plan_id, organization_id, student_id);

alter table public.student_exam_ranges enable row level security;
alter table public.student_exam_range_items enable row level security;
create policy student_exam_ranges_read on public.student_exam_ranges for select to authenticated
  using (private.can_access_student(organization_id, student_id, 'study_plans.read'));
create policy student_exam_range_items_read on public.student_exam_range_items for select to authenticated
  using (private.can_access_student(organization_id, student_id, 'study_plans.read'));
revoke all on public.student_exam_ranges, public.student_exam_range_items from public, anon, authenticated;
grant select on public.student_exam_ranges, public.student_exam_range_items to authenticated;

create function public.read_student_exam_ranges(target_organization_id text, target_student_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not coalesce(private.can_access_student(target_organization_id, target_student_id, 'study_plans.read'), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  select jsonb_build_object(
    'organizationId', target_organization_id, 'studentId', target_student_id,
    'ranges', coalesce((select jsonb_agg(jsonb_build_object(
      'id', r.id, 'organizationId', r.organization_id, 'studentId', r.student_id,
      'name', r.name, 'examDate', r.exam_date, 'revision', r.revision,
      'itemIds', coalesce((select jsonb_agg(m.learning_item_id order by m.learning_item_id)
        from public.student_exam_range_items m where m.range_id = r.id and m.organization_id = r.organization_id), '[]'::jsonb)
    ) order by r.exam_date nulls last, r.created_at, r.id) from public.student_exam_ranges r
      where r.organization_id = target_organization_id and r.student_id = target_student_id), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', i.id, 'planId', p.id, 'planLabel', t.name || ' v' || v.version_number::text || '（' || p.term_id || '）',
      'planStatus', case when p.deleted_at is not null then 'archived' else p.status end,
      'title', i.title, 'type', i.item_type, 'status', i.status,
      'parentId', parent.id
    )) order by p.created_at, p.id, i.position, i.id)
      from public.student_learning_items i
      join public.study_plans p on p.id = i.study_plan_id and p.organization_id = i.organization_id
      join public.curriculum_versions v on v.id = p.version_id and v.organization_id = p.organization_id
      join public.curriculum_templates t on t.id = v.template_id and t.organization_id = v.organization_id
      left join public.curriculum_items source on source.id = i.source_item_id and source.organization_id = i.organization_id
      left join public.student_learning_items parent on parent.source_item_id = source.parent_id
        and parent.study_plan_id = p.id and parent.organization_id = p.organization_id
      where p.organization_id = target_organization_id and p.student_id = target_student_id), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create function public.save_student_exam_range(target_organization_id text, command jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  student_id_value text := command->>'studentId';
  range_id_value text := nullif(command->>'rangeId', '');
  expected_revision integer := (command->>'revision')::integer;
  range_name text := btrim(command->>'name');
  date_text text := nullif(command->>'examDate', '');
  range_date date;
  selected_ids text[];
  previous_range public.student_exam_ranges%rowtype;
begin
  if not coalesce(private.can_access_student(target_organization_id, student_id_value, 'study_plans.manage'), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if range_name is null or length(range_name) not between 1 and 100 or expected_revision is null
    or jsonb_typeof(command->'itemIds') is distinct from 'array' then
    raise exception using errcode = '23514', message = 'INVALID_RANGE';
  end if;
  if jsonb_array_length(command->'itemIds') not between 1 and 500
    or exists(select 1 from jsonb_array_elements(command->'itemIds') x where jsonb_typeof(x) <> 'string') then
    raise exception using errcode = '23514', message = 'INVALID_SELECTION';
  end if;
  if date_text is not null then
    if date_text !~ '^\d{4}-\d{2}-\d{2}$' then raise exception using errcode = '23514', message = 'INVALID_DATE'; end if;
    range_date := date_text::date;
    if to_char(range_date, 'YYYY-MM-DD') <> date_text or range_date < date '0001-01-01' then
      raise exception using errcode = '23514', message = 'INVALID_DATE';
    end if;
  end if;
  select array_agg(distinct x) into selected_ids from jsonb_array_elements_text(command->'itemIds') x;
  -- Same first lock as replace_student_study_plan: serialize saves with replacement.
  perform 1 from public.students s where s.id = student_id_value and s.organization_id = target_organization_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'STUDENT_NOT_FOUND'; end if;
  perform 1 from public.study_plans p where p.student_id = student_id_value and p.organization_id = target_organization_id order by p.id for update;
  if range_id_value is null then
    if expected_revision <> 0 then raise exception using errcode = '23514', message = 'INVALID_REVISION'; end if;
  else
    select r.* into previous_range from public.student_exam_ranges r where r.id = range_id_value
      and r.organization_id = target_organization_id and r.student_id = student_id_value for update;
    if not found then raise exception using errcode = 'P0002', message = 'RANGE_NOT_FOUND'; end if;
    if previous_range.revision <> expected_revision then raise exception using errcode = '40001', message = 'RANGE_CONFLICT'; end if;
  end if;
  -- RPC receives normalized countable leaves; units expand at the service boundary.
  if exists(select 1 from unnest(selected_ids) selected(id) where not exists (
    select 1 from public.student_learning_items i join public.study_plans p on p.id = i.study_plan_id and p.organization_id = i.organization_id
    where i.id = selected.id and i.organization_id = target_organization_id and p.student_id = student_id_value
      and i.item_type <> 'unit' and (
        (p.status = 'active' and p.deleted_at is null and i.status <> 'removed')
        or exists(select 1 from public.student_exam_range_items old where old.range_id = range_id_value
          and old.learning_item_id = i.id and old.organization_id = target_organization_id and old.student_id = student_id_value)
      )
  )) then raise exception using errcode = '23514', message = 'INVALID_SELECTION'; end if;
  if range_id_value is null then
    insert into public.student_exam_ranges(organization_id, student_id, name, exam_date)
      values(target_organization_id, student_id_value, range_name, range_date) returning id into range_id_value;
  else
    update public.student_exam_ranges set name = range_name, exam_date = range_date, revision = revision + 1, updated_at = clock_timestamp()
      where id = range_id_value and organization_id = target_organization_id;
    delete from public.student_exam_range_items where range_id = range_id_value and organization_id = target_organization_id;
  end if;
  insert into public.student_exam_range_items(organization_id, student_id, range_id, study_plan_id, learning_item_id)
    select target_organization_id, student_id_value, range_id_value, i.study_plan_id, i.id from public.student_learning_items i
      where i.organization_id = target_organization_id and i.id = any(selected_ids);
  return jsonb_build_object('id', range_id_value);
end;
$$;

revoke all on function public.read_student_exam_ranges(text, text) from public, anon;
revoke all on function public.save_student_exam_range(text, jsonb) from public, anon;
grant execute on function public.read_student_exam_ranges(text, text) to authenticated;
grant execute on function public.save_student_exam_range(text, jsonb) to authenticated;
commit;
