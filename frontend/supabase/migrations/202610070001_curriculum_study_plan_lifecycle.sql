begin;

create table if not exists public.curriculum_templates (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  grade_id text not null,
  subject_id text not null,
  publisher_id text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table if not exists public.curriculum_versions (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  template_id text not null,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, template_id, version_number),
  foreign key (template_id, organization_id)
    references public.curriculum_templates(id, organization_id) on delete restrict
);

create table if not exists public.curriculum_items (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  version_id text not null,
  lineage_id text not null,
  parent_id text,
  item_type text not null check (item_type in ('chapter', 'unit', 'material', 'worksheet', 'assessment')),
  title text not null check (length(btrim(title)) > 0),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, version_id, position),
  unique (organization_id, version_id, lineage_id),
  foreign key (version_id, organization_id)
    references public.curriculum_versions(id, organization_id) on delete cascade,
  foreign key (parent_id, organization_id)
    references public.curriculum_items(id, organization_id) on delete restrict
);

create table if not exists public.study_plans (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  student_id text not null,
  term_id text not null,
  grade_id text not null,
  subject_id text not null,
  version_id text not null,
  status text not null default 'active'
    check (status in ('draft', 'active', 'completed', 'replaced', 'archived')),
  replaced_by_plan_id text,
  completed_at timestamptz,
  replaced_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  deleted_by_profile_id text references public.profiles(id) on delete set null,
  delete_reason text,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (student_id, organization_id)
    references public.students(id, organization_id) on delete restrict,
  foreign key (version_id, organization_id)
    references public.curriculum_versions(id, organization_id) on delete restrict,
  foreign key (replaced_by_plan_id, organization_id)
    references public.study_plans(id, organization_id) on delete restrict,
  check ((status = 'completed') = (completed_at is not null)),
  check ((status = 'replaced') = (replaced_at is not null)),
  check (deleted_at is null or length(btrim(coalesce(delete_reason, ''))) > 0)
);

create unique index if not exists study_plans_one_active_subject_idx
  on public.study_plans (organization_id, student_id, term_id, subject_id)
  where status = 'active' and deleted_at is null;

create table if not exists public.student_learning_items (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  study_plan_id text not null,
  source_item_id text,
  lineage_id text not null,
  item_type text not null check (item_type in ('chapter', 'unit', 'material', 'worksheet', 'assessment')),
  title text not null check (length(btrim(title)) > 0),
  position integer not null check (position >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'skipped', 'removed')),
  is_custom boolean not null default false,
  note text not null default '',
  completed_at timestamptz,
  removed_at timestamptz,
  removed_reason text,
  carried_from_item_id text,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, study_plan_id, lineage_id),
  foreign key (study_plan_id, organization_id)
    references public.study_plans(id, organization_id) on delete restrict,
  foreign key (source_item_id, organization_id)
    references public.curriculum_items(id, organization_id) on delete restrict,
  foreign key (carried_from_item_id, organization_id)
    references public.student_learning_items(id, organization_id) on delete restrict,
  check ((status = 'completed') = (completed_at is not null)),
  check ((status = 'removed') = (removed_at is not null)),
  check (status <> 'removed' or length(btrim(coalesce(removed_reason, ''))) > 0)
);

create table if not exists public.assessment_series (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  curriculum_template_id text,
  title text not null check (length(btrim(title)) > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (curriculum_template_id, organization_id)
    references public.curriculum_templates(id, organization_id) on delete restrict
);

alter table public.assessments
  add column if not exists assessment_kind text not null default 'extra'
    check (assessment_kind in ('curriculum', 'extra')),
  add column if not exists series_id text,
  add column if not exists curriculum_item_id text;

alter table public.assessment_results
  add column if not exists study_plan_id text,
  add column if not exists learning_item_id text,
  add column if not exists class_session_id uuid,
  add column if not exists completed_at timestamptz not null default now();

alter table public.assessments
  add constraint assessments_series_organization_fk
  foreign key (series_id, organization_id)
    references public.assessment_series(id, organization_id) on delete restrict,
  add constraint assessments_curriculum_item_organization_fk
  foreign key (curriculum_item_id, organization_id)
    references public.curriculum_items(id, organization_id) on delete restrict,
  add constraint assessments_kind_relationship_check
  check (
    (assessment_kind = 'curriculum' and curriculum_item_id is not null)
    or assessment_kind = 'extra'
  );

alter table public.assessment_results
  add constraint assessment_results_study_plan_organization_fk
  foreign key (study_plan_id, organization_id)
    references public.study_plans(id, organization_id) on delete restrict,
  add constraint assessment_results_learning_item_organization_fk
  foreign key (learning_item_id, organization_id)
    references public.student_learning_items(id, organization_id) on delete restrict,
  add constraint assessment_results_class_session_organization_fk
  foreign key (class_session_id, organization_id)
    references public.class_sessions(id, organization_id) on delete restrict;

create index if not exists curriculum_versions_template_idx
  on public.curriculum_versions (organization_id, template_id, version_number desc);
create index if not exists curriculum_items_version_position_idx
  on public.curriculum_items (organization_id, version_id, position);
create index if not exists study_plans_student_status_idx
  on public.study_plans (organization_id, student_id, status, term_id);
create index if not exists student_learning_items_plan_position_idx
  on public.student_learning_items (organization_id, study_plan_id, position);
create index if not exists assessment_series_template_idx
  on public.assessment_series (organization_id, curriculum_template_id);
create index if not exists assessment_results_plan_idx
  on public.assessment_results (organization_id, study_plan_id, completed_at desc);

alter table public.curriculum_templates enable row level security;
alter table public.curriculum_versions enable row level security;
alter table public.curriculum_items enable row level security;
alter table public.study_plans enable row level security;
alter table public.student_learning_items enable row level security;
alter table public.assessment_series enable row level security;

revoke all on table public.curriculum_templates, public.curriculum_versions,
  public.curriculum_items, public.study_plans, public.student_learning_items,
  public.assessment_series from anon, authenticated;
grant select, insert, update on table public.curriculum_templates, public.curriculum_versions,
  public.curriculum_items, public.study_plans, public.student_learning_items,
  public.assessment_series to authenticated;

create policy curriculum_templates_select_organization
on public.curriculum_templates for select to authenticated using (
  private.has_permission(organization_id, 'curriculum.read')
);
create policy curriculum_templates_manage_organization
on public.curriculum_templates for all to authenticated using (
  private.has_permission(organization_id, 'curriculum.manage')
) with check (
  private.has_permission(organization_id, 'curriculum.manage')
);

create policy curriculum_versions_select_organization
on public.curriculum_versions for select to authenticated using (
  private.has_permission(organization_id, 'curriculum.read')
);
create policy curriculum_versions_manage_organization
on public.curriculum_versions for all to authenticated using (
  private.has_permission(organization_id, 'curriculum.manage')
) with check (
  private.has_permission(organization_id, 'curriculum.manage')
);

create policy curriculum_items_select_organization
on public.curriculum_items for select to authenticated using (
  private.has_permission(organization_id, 'curriculum.read')
);
create policy curriculum_items_manage_organization
on public.curriculum_items for all to authenticated using (
  private.has_permission(organization_id, 'curriculum.manage')
) with check (
  private.has_permission(organization_id, 'curriculum.manage')
);

create policy study_plans_select_by_student
on public.study_plans for select to authenticated using (
  private.can_access_student(organization_id, student_id, 'study_plans.read')
);
create policy study_plans_manage_by_student
on public.study_plans for all to authenticated using (
  private.can_access_student(organization_id, student_id, 'study_plans.manage')
) with check (
  private.can_access_student(organization_id, student_id, 'study_plans.manage')
);

create policy student_learning_items_select_by_plan
on public.student_learning_items for select to authenticated using (
  exists (
    select 1 from public.study_plans plan
    where plan.id = student_learning_items.study_plan_id
      and plan.organization_id = student_learning_items.organization_id
      and private.can_access_student(plan.organization_id, plan.student_id, 'study_plans.read')
  )
);
create policy student_learning_items_manage_by_plan
on public.student_learning_items for all to authenticated using (
  exists (
    select 1 from public.study_plans plan
    where plan.id = student_learning_items.study_plan_id
      and plan.organization_id = student_learning_items.organization_id
      and private.can_access_student(plan.organization_id, plan.student_id, 'study_plans.manage')
  )
) with check (
  exists (
    select 1 from public.study_plans plan
    where plan.id = student_learning_items.study_plan_id
      and plan.organization_id = student_learning_items.organization_id
      and private.can_access_student(plan.organization_id, plan.student_id, 'study_plans.manage')
  )
);

create policy assessment_series_select_organization
on public.assessment_series for select to authenticated using (
  private.has_permission(organization_id, 'curriculum.read')
  or private.has_permission(organization_id, 'assessment_history.read')
);
create policy assessment_series_manage_organization
on public.assessment_series for all to authenticated using (
  private.has_permission(organization_id, 'curriculum.manage')
) with check (
  private.has_permission(organization_id, 'curriculum.manage')
);

create or replace function public.replace_student_study_plan(
  target_organization_id text,
  target_student_id text,
  target_term_id text,
  target_version_id text
)
returns table (study_plan_id text, replaced_plan_id text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  selected_version public.curriculum_versions%rowtype;
  selected_template public.curriculum_templates%rowtype;
  current_plan public.study_plans%rowtype;
  created_plan_id text := 'plan-' || gen_random_uuid()::text;
  changed_at timestamptz := now();
begin
  if not private.can_access_student(target_organization_id, target_student_id, 'study_plans.manage') then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select version.* into selected_version
  from public.curriculum_versions version
  where version.id = target_version_id
    and version.organization_id = target_organization_id
    and version.status = 'published';
  if not found then
    raise exception using errcode = 'P0002', message = 'PUBLISHED_VERSION_NOT_FOUND';
  end if;

  select template.* into selected_template
  from public.curriculum_templates template
  where template.id = selected_version.template_id
    and template.organization_id = target_organization_id
    and template.archived_at is null;
  if not found then
    raise exception using errcode = 'P0002', message = 'CURRICULUM_TEMPLATE_NOT_FOUND';
  end if;

  select plan.* into current_plan
  from public.study_plans plan
  where plan.organization_id = target_organization_id
    and plan.student_id = target_student_id
    and plan.term_id = target_term_id
    and plan.subject_id = selected_template.subject_id
    and plan.status = 'active'
    and plan.deleted_at is null
  for update;

  if found and current_plan.version_id = target_version_id then
    raise exception using errcode = '23505', message = 'STUDY_PLAN_ALREADY_ACTIVE';
  end if;

  insert into public.study_plans
    (id, organization_id, student_id, term_id, grade_id, subject_id, version_id, status)
  values
    (created_plan_id, target_organization_id, target_student_id, target_term_id,
     selected_template.grade_id, selected_template.subject_id, target_version_id, 'active');

  insert into public.student_learning_items
    (id, organization_id, study_plan_id, source_item_id, lineage_id, item_type,
     title, position, status, completed_at, carried_from_item_id)
  select
    'learn-' || gen_random_uuid()::text,
    target_organization_id,
    created_plan_id,
    item.id,
    item.lineage_id,
    item.item_type,
    item.title,
    item.position,
    case when completed.id is not null then 'completed' else 'pending' end,
    case when completed.id is not null then coalesce(completed.completed_at, changed_at) end,
    completed.id
  from public.curriculum_items item
  left join public.student_learning_items completed
    on current_plan.id is not null
   and completed.organization_id = target_organization_id
   and completed.study_plan_id = current_plan.id
   and completed.lineage_id = item.lineage_id
   and completed.status = 'completed'
  where item.organization_id = target_organization_id
    and item.version_id = target_version_id;

  if current_plan.id is not null then
    update public.student_learning_items learning_item
    set status = 'removed', removed_at = changed_at,
        removed_reason = '修課計畫已更換', revision = learning_item.revision + 1
    where learning_item.organization_id = target_organization_id
      and learning_item.study_plan_id = current_plan.id
      and learning_item.status not in ('completed', 'removed');

    update public.study_plans plan
    set status = 'replaced', replaced_by_plan_id = created_plan_id,
        replaced_at = changed_at, revision = plan.revision + 1
    where plan.id = current_plan.id and plan.organization_id = target_organization_id;
  end if;

  return query select created_plan_id, current_plan.id;
end;
$$;

create or replace function public.record_extra_assessment_result(
  target_organization_id text,
  target_student_id text,
  target_term_id text,
  target_subject text,
  assessment_title text,
  assessment_date date,
  assessment_maximum_score numeric,
  result_score numeric,
  result_comment text
)
returns table (assessment_id text, result_id text)
language plpgsql security definer set search_path = '' as $$
declare
  created_assessment_id text := 'assessment-' || gen_random_uuid()::text;
  created_result_id text := 'result-' || gen_random_uuid()::text;
begin
  if not private.can_access_student(
    target_organization_id, target_student_id, 'assessment_history.manage'
  ) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if length(btrim(target_term_id)) = 0
    or length(btrim(target_subject)) = 0
    or length(btrim(assessment_title)) = 0
    or assessment_maximum_score <= 0
    or result_score < 0
    or result_score > assessment_maximum_score then
    raise exception using errcode = '23514', message = 'INVALID_ASSESSMENT_RESULT';
  end if;

  insert into public.assessments
    (id, organization_id, term_id, subject, title, assessment_date,
     maximum_score, assessment_kind)
  values
    (created_assessment_id, target_organization_id, btrim(target_term_id),
     btrim(target_subject), btrim(assessment_title), assessment_date,
     assessment_maximum_score, 'extra');

  insert into public.assessment_results
    (id, organization_id, assessment_id, student_id, score, comment,
     updated_by_profile_id, completed_at)
  values
    (created_result_id, target_organization_id, created_assessment_id,
     target_student_id, result_score, btrim(coalesce(result_comment, '')),
     private.current_profile_id(), now());

  return query select created_assessment_id, created_result_id;
end;
$$;

revoke all on function public.replace_student_study_plan(text, text, text, text) from public;
grant execute on function public.replace_student_study_plan(text, text, text, text) to authenticated;
revoke all on function public.record_extra_assessment_result(
  text, text, text, text, text, date, numeric, numeric, text
) from public;
grant execute on function public.record_extra_assessment_result(
  text, text, text, text, text, date, numeric, numeric, text
) to authenticated;

commit;
