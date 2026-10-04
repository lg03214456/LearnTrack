begin;

do $$
declare
  target_function regprocedure;
  function_definition text;
begin
  foreach target_function in array array[
    'public.save_class_aggregate(text,text,integer,text,text,text,integer,text,text[],text[],text,jsonb,text[])'::regprocedure,
    'public.save_student_aggregate(text,text,integer,text,text,text,text,text,text[])'::regprocedure,
    'public.change_student_lifecycle(text,text,integer,text,text)'::regprocedure
  ]
  loop
    select pg_get_functiondef(target_function) into function_definition;
    if position('#variable_conflict use_column' in function_definition) = 0 then
      function_definition := replace(
        function_definition,
        'AS $function$',
        E'AS $function$\n#variable_conflict use_column'
      );
      execute function_definition;
    end if;
  end loop;
end;
$$;

commit;
