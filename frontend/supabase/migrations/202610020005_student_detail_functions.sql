begin;

insert into public.student_profiles (student_id, organization_id, phone, school, grade)
select s.id, s.organization_id, '', '', ''
from public.students s
where not exists (
  select 1 from public.student_profiles sp
  where sp.student_id = s.id and sp.organization_id = s.organization_id
)
on conflict (student_id) do nothing;

create or replace function public.save_student_detail_profile(
  target_organization_id text,
  target_student_id text,
  target_contact_id uuid,
  expected_revision integer,
  student_phone text,
  student_school text,
  student_grade text,
  contact_name text,
  contact_phone text
)
returns table (student_id text, revision integer)
language plpgsql security definer set search_path = '' as $$
declare current_revision integer;
begin
  if not private.can_access_student(target_organization_id, target_student_id, 'student_profiles.manage') then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  select sp.revision into current_revision from public.student_profiles sp
  where sp.student_id = target_student_id and sp.organization_id = target_organization_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'STUDENT_PROFILE_NOT_FOUND'; end if;
  if current_revision <> expected_revision then
    raise exception using errcode = '40001', message = 'REVISION_CONFLICT';
  end if;
  if length(btrim(student_phone)) = 0 or length(btrim(student_school)) = 0
    or length(btrim(student_grade)) = 0 or length(btrim(contact_name)) = 0
    or length(btrim(contact_phone)) = 0 then
    raise exception using errcode = '23514', message = 'REQUIRED_FIELD_MISSING';
  end if;

  update public.student_profiles sp set phone = btrim(student_phone), school = btrim(student_school),
    grade = btrim(student_grade), revision = sp.revision + 1
  where sp.student_id = target_student_id and sp.organization_id = target_organization_id
  returning sp.revision into current_revision;
  update public.student_contacts sc set display_name = btrim(contact_name), phone = btrim(contact_phone),
    revision = sc.revision + 1
  where sc.id = target_contact_id and sc.student_id = target_student_id
    and sc.organization_id = target_organization_id and sc.status = 'active';
  if not found then raise exception using errcode = 'P0002', message = 'STUDENT_CONTACT_NOT_FOUND'; end if;
  return query select target_student_id, current_revision;
end;
$$;

create or replace function public.record_assessment_result(
  target_organization_id text,
  target_student_id text,
  target_assessment_id text,
  result_score numeric,
  result_comment text
)
returns table (result_id text, revision integer)
language plpgsql security definer set search_path = '' as $$
declare persisted_result_id text := 'result-' || gen_random_uuid()::text;
begin
  if not private.can_access_student(target_organization_id, target_student_id, 'assessment_history.manage') then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if not exists (select 1 from public.assessments a where a.id = target_assessment_id
    and a.organization_id = target_organization_id) then
    raise exception using errcode = 'P0002', message = 'ASSESSMENT_NOT_FOUND';
  end if;
  insert into public.assessment_results
    (id, organization_id, assessment_id, student_id, score, comment, updated_by_profile_id)
  values (persisted_result_id, target_organization_id, target_assessment_id, target_student_id,
    result_score, btrim(coalesce(result_comment, '')), private.current_profile_id());
  return query select persisted_result_id, 1;
end;
$$;

create or replace function public.correct_assessment_result(
  target_organization_id text,
  target_result_id text,
  expected_revision integer,
  result_score numeric,
  result_comment text
)
returns table (result_id text, revision integer)
language plpgsql security definer set search_path = '' as $$
declare target_student_id text; current_revision integer;
begin
  select ar.student_id, ar.revision into target_student_id, current_revision
  from public.assessment_results ar where ar.id = target_result_id
    and ar.organization_id = target_organization_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'ASSESSMENT_RESULT_NOT_FOUND'; end if;
  if not private.can_access_student(target_organization_id, target_student_id, 'assessment_history.manage') then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if current_revision <> expected_revision then
    raise exception using errcode = '40001', message = 'REVISION_CONFLICT';
  end if;
  update public.assessment_results ar set score = result_score,
    comment = btrim(coalesce(result_comment, '')), revision = ar.revision + 1,
    updated_by_profile_id = private.current_profile_id()
  where ar.id = target_result_id and ar.organization_id = target_organization_id
  returning ar.revision into current_revision;
  return query select target_result_id, current_revision;
end;
$$;

revoke all on function public.save_student_detail_profile(text, text, uuid, integer, text, text, text, text, text) from public;
revoke all on function public.record_assessment_result(text, text, text, numeric, text) from public;
revoke all on function public.correct_assessment_result(text, text, integer, numeric, text) from public;
grant execute on function public.save_student_detail_profile(text, text, uuid, integer, text, text, text, text, text) to authenticated;
grant execute on function public.record_assessment_result(text, text, text, numeric, text) to authenticated;
grant execute on function public.correct_assessment_result(text, text, integer, numeric, text) to authenticated;

commit;
