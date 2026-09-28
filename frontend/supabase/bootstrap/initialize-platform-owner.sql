-- Run only after the Auth user is created and email-verified.
-- Replace the placeholder below. This script does not create an Auth user or store a password.
do $$
declare
  target_email constant text := lower('platform-owner@example.invalid');
  target_profile_id text;
begin
  if target_email = 'platform-owner@example.invalid' then
    raise exception 'Replace the Platform Owner email placeholder before running this script';
  end if;

  select p.id into target_profile_id
  from public.profiles p
  join auth.users u on u.id = p.auth_user_id
  where lower(u.email) = target_email
    and u.email_confirmed_at is not null;

  if target_profile_id is null then
    raise exception 'A verified Auth user linked to a profile is required';
  end if;

  if exists (
    select 1 from public.organization_memberships
    where profile_id = target_profile_id and status = 'active'
  ) then
    raise exception 'Platform Owner must not also have an active organization membership';
  end if;

  insert into public.platform_operators (profile_id, role_code, status)
  values (target_profile_id, 'platform-owner', 'active')
  on conflict (profile_id) do update
    set role_code = excluded.role_code, status = excluded.status, updated_at = now();
end $$;
