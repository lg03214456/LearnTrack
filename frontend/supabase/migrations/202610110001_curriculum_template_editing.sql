-- Apply after 202610100002_curriculum_functions.sql. No existing learning records are changed.
begin;
alter table public.curriculum_templates add column if not exists revision integer not null default 1 check (revision > 0);

create or replace function public.read_curriculum_template_editor(target_organization_id text, target_template_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare selected_template public.curriculum_templates%rowtype;
begin
  if not coalesce(private.has_permission(target_organization_id, 'curriculum.manage'), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  select * into selected_template from public.curriculum_templates
  where id = target_template_id and organization_id = target_organization_id and archived_at is null;
  if not found then raise exception using errcode = 'P0002', message = 'TEMPLATE_NOT_FOUND'; end if;
  return jsonb_build_object(
    'templateId', selected_template.id, 'name', selected_template.name,
    'gradeId', selected_template.grade_id, 'subjectId', selected_template.subject_id,
    'publisherId', selected_template.publisher_id, 'revision', selected_template.revision,
    'canEditClassification', not exists (select 1 from public.curriculum_versions v
      where v.organization_id = target_organization_id and v.template_id = target_template_id
      and (v.status = 'published' or exists (select 1 from public.study_plans p
        where p.organization_id = target_organization_id and p.version_id = v.id))),
    'dimensions', jsonb_build_object(
      'grades', '[{"id":"g7","name":"國一"},{"id":"g8","name":"國二"},{"id":"g9","name":"國三"}]'::jsonb,
      'publishers', '[{"id":"hanlin","name":"翰林"},{"id":"kanghsuan","name":"康軒"},{"id":"custom","name":"自編教材"}]'::jsonb,
      'subjects', coalesce((select jsonb_agg(jsonb_build_object('id', s.code, 'name', s.name) order by s.position, s.code)
        from public.subjects s where s.organization_id = target_organization_id
        and (s.status = 'active' or s.code = selected_template.subject_id)), '[]'::jsonb)));
end;
$$;

create or replace function public.update_curriculum_template(target_organization_id text, command jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare selected_template public.curriculum_templates%rowtype;
begin
  if not coalesce(private.has_permission(target_organization_id, 'curriculum.manage'), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  select * into selected_template from public.curriculum_templates
  where id = command->>'templateId' and organization_id = target_organization_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'TEMPLATE_NOT_FOUND'; end if;
  if selected_template.archived_at is not null or (command->>'revision') is distinct from selected_template.revision::text then
    raise exception using errcode = '40001', message = 'TEMPLATE_CONFLICT';
  end if;
  if coalesce(length(btrim(command->>'name')), 0) not between 1 and 200
    or coalesce(command->>'gradeId', '') not in ('g7', 'g8', 'g9')
    or coalesce(command->>'publisherId', '') not in ('hanlin', 'kanghsuan', 'custom')
    or not exists (select 1 from public.subjects s where s.organization_id = target_organization_id
      and s.code = command->>'subjectId' and (s.status = 'active' or s.code = selected_template.subject_id)) then
    raise exception using errcode = '23514', message = 'INVALID_CLASSIFICATION';
  end if;
  if (selected_template.grade_id is distinct from command->>'gradeId' or selected_template.subject_id is distinct from command->>'subjectId')
    and exists (select 1 from public.curriculum_versions v where v.organization_id = target_organization_id
      and v.template_id = selected_template.id and (v.status = 'published' or exists (
        select 1 from public.study_plans p where p.organization_id = target_organization_id and p.version_id = v.id))) then
    raise exception using errcode = '40001', message = 'CLASSIFICATION_LOCKED';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_organization_id || ':curriculum:' || btrim(command->>'name'), 0));
  if exists (select 1 from public.curriculum_templates t where t.organization_id = target_organization_id
    and t.id <> selected_template.id and t.archived_at is null and t.name = btrim(command->>'name')) then
    raise exception using errcode = '23505', message = 'TEMPLATE_NAME_EXISTS';
  end if;
  update public.curriculum_templates set name = btrim(command->>'name'), grade_id = command->>'gradeId',
    subject_id = command->>'subjectId', publisher_id = command->>'publisherId',
    revision = revision + 1, updated_at = clock_timestamp()
  where id = selected_template.id and organization_id = target_organization_id;
  return jsonb_build_object('id', selected_template.id);
end;
$$;
revoke all on function public.read_curriculum_template_editor(text, text) from public, anon;
revoke all on function public.update_curriculum_template(text, jsonb) from public, anon;
grant execute on function public.read_curriculum_template_editor(text, text) to authenticated;
grant execute on function public.update_curriculum_template(text, jsonb) to authenticated;
revoke insert, update, delete on public.curriculum_templates from authenticated;
notify pgrst, 'reload schema';
commit;
