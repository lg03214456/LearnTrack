begin;

alter table public.student_contacts
  alter column contact_profile_id drop not null,
  add column if not exists display_name text,
  add column if not exists phone text,
  add column if not exists revision integer not null default 1 check (revision > 0),
  add column if not exists updated_at timestamptz not null default now();

update public.student_contacts sc
set display_name = p.display_name,
    phone = coalesce(sc.phone, '')
from public.profiles p
where p.id = sc.contact_profile_id and sc.display_name is null;

alter table public.student_contacts
  add constraint student_contacts_identity_check
  check (contact_profile_id is not null or length(btrim(coalesce(display_name, ''))) > 0);

create table if not exists public.assessments (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  class_id text,
  term_id text not null,
  subject text not null,
  title text not null,
  assessment_date date not null,
  maximum_score numeric(8, 2) not null check (maximum_score > 0),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (class_id, organization_id)
    references public.course_classes(id, organization_id) on delete restrict
);

create table if not exists public.assessment_results (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  assessment_id text not null,
  student_id text not null,
  score numeric(8, 2) not null check (score >= 0),
  comment text not null default '',
  revision integer not null default 1 check (revision > 0),
  updated_by_profile_id text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, assessment_id, student_id),
  foreign key (assessment_id, organization_id)
    references public.assessments(id, organization_id) on delete restrict,
  foreign key (student_id, organization_id)
    references public.students(id, organization_id) on delete restrict
);

create index if not exists student_contacts_organization_student_status_idx
  on public.student_contacts (organization_id, student_id, status);
create index if not exists assessments_organization_date_idx
  on public.assessments (organization_id, assessment_date desc);
create index if not exists assessments_organization_term_subject_idx
  on public.assessments (organization_id, term_id, subject);
create index if not exists assessment_results_organization_student_idx
  on public.assessment_results (organization_id, student_id, assessment_id);

drop trigger if exists student_contacts_set_updated_at on public.student_contacts;
create trigger student_contacts_set_updated_at before update on public.student_contacts
for each row execute function public.set_updated_at();
drop trigger if exists assessments_set_updated_at on public.assessments;
create trigger assessments_set_updated_at before update on public.assessments
for each row execute function public.set_updated_at();
drop trigger if exists assessment_results_set_updated_at on public.assessment_results;
create trigger assessment_results_set_updated_at before update on public.assessment_results
for each row execute function public.set_updated_at();

create or replace function private.validate_assessment_result_score()
returns trigger language plpgsql set search_path = '' as $$
declare allowed_maximum numeric(8, 2);
begin
  select a.maximum_score into allowed_maximum
  from public.assessments a
  where a.id = new.assessment_id and a.organization_id = new.organization_id;
  if allowed_maximum is null then
    raise exception using errcode = '23503', message = 'ASSESSMENT_NOT_FOUND';
  end if;
  if new.score > allowed_maximum then
    raise exception using errcode = '23514', message = 'SCORE_EXCEEDS_MAXIMUM';
  end if;
  return new;
end;
$$;

drop trigger if exists assessment_results_validate_score on public.assessment_results;
create trigger assessment_results_validate_score
before insert or update of score, assessment_id, organization_id on public.assessment_results
for each row execute function private.validate_assessment_result_score();

alter table public.assessments enable row level security;
alter table public.assessment_results enable row level security;

revoke all on table public.assessments, public.assessment_results from anon, authenticated;
grant select, insert, update on table public.assessments, public.assessment_results to authenticated;

create policy assessments_select_by_relationship
on public.assessments for select to authenticated using (
  private.has_organization_wide_permission(organization_id, 'assessment_history.read')
  or (class_id is not null and private.can_access_class(organization_id, class_id, 'assessment_history.read'))
  or exists (
    select 1 from public.assessment_results ar
    where ar.assessment_id = assessments.id
      and ar.organization_id = assessments.organization_id
      and private.can_access_student(ar.organization_id, ar.student_id, 'assessment_history.read')
  )
);
create policy assessments_insert_organization_manager
on public.assessments for insert to authenticated
with check (private.has_organization_wide_permission(organization_id, 'assessment_history.manage'));
create policy assessments_update_organization_manager
on public.assessments for update to authenticated
using (private.has_organization_wide_permission(organization_id, 'assessment_history.manage'))
with check (private.has_organization_wide_permission(organization_id, 'assessment_history.manage'));

create policy assessment_results_select_by_relationship
on public.assessment_results for select to authenticated using (
  private.can_access_student(organization_id, student_id, 'assessment_history.read')
);
create policy assessment_results_insert_by_relationship
on public.assessment_results for insert to authenticated with check (
  private.can_access_student(organization_id, student_id, 'assessment_history.manage')
);
create policy assessment_results_update_by_relationship
on public.assessment_results for update to authenticated
using (private.can_access_student(organization_id, student_id, 'assessment_history.manage'))
with check (private.can_access_student(organization_id, student_id, 'assessment_history.manage'));

commit;
