begin;

lock table public.students in share row exclusive mode;

with organization_maximums as (
  select
    organization_id,
    coalesce(max(substring(student_number from '^STU-([0-9]+)$')::bigint), 0) as maximum_number
  from public.students
  where student_number ~ '^STU-[0-9]+$'
  group by organization_id
),
missing_numbers as (
  select
    student.id,
    student.organization_id,
    row_number() over (
      partition by student.organization_id
      order by student.created_at, student.id
    ) as sequence_offset
  from public.students student
  where length(btrim(coalesce(student.student_number, ''))) = 0
),
assigned_numbers as (
  select
    missing.id,
    missing.organization_id,
    coalesce(maximum.maximum_number, 0) + missing.sequence_offset as assigned_number
  from missing_numbers missing
  left join organization_maximums maximum
    on maximum.organization_id = missing.organization_id
)
update public.students student
set
  student_number = 'STU-' || lpad(assigned.assigned_number::text, 4, '0'),
  updated_at = now()
from assigned_numbers assigned
where student.id = assigned.id
  and student.organization_id = assigned.organization_id
  and length(btrim(coalesce(student.student_number, ''))) = 0;

commit;
