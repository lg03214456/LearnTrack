begin;

alter table public.course_classes
  drop constraint if exists course_classes_class_type_check;

alter table public.course_classes
  add constraint course_classes_class_type_check
    check (class_type in ('progress', 'individual', 'study'));

commit;
