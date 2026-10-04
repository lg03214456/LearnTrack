begin;

create or replace function private.assign_student_number()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  next_number bigint;
begin
  if length(btrim(coalesce(new.student_number, ''))) > 0 then
    new.student_number := upper(btrim(new.student_number));
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('learntrack-student-number:' || new.organization_id, 0));
  select coalesce(max(substring(s.student_number from '^STU-([0-9]+)$')::bigint), 0) + 1
  into next_number
  from public.students s
  where s.organization_id = new.organization_id
    and s.student_number ~ '^STU-[0-9]+$';

  new.student_number := 'STU-' || lpad(next_number::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists students_assign_student_number on public.students;
create trigger students_assign_student_number
before insert on public.students
for each row execute function private.assign_student_number();

revoke all on function private.assign_student_number() from public;

commit;
