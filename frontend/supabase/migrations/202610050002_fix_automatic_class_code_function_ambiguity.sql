begin;

do $$
declare
  target_function regprocedure :=
    'public.save_class_aggregate(text,text,integer,text,text,text,integer,text,text[],text[],text,jsonb,text[])'::regprocedure;
  function_definition text;
begin
  select pg_get_functiondef(target_function) into function_definition;

  if position('#variable_conflict use_column' in function_definition) = 0 then
    function_definition := replace(
      function_definition,
      'AS $function$',
      E'AS $function$\n#variable_conflict use_column'
    );
    execute function_definition;
  end if;
end;
$$;

commit;
