-- LearnTrack initial Owner bootstrap
--
-- Before running this script in the Supabase SQL Editor:
--   1. Create and verify the user in Authentication > Users.
--   2. Replace the three values in the input section below.
--   3. Run this script only once for a new LearnTrack organization.
--
-- This script does not create an Auth user or store a password. It links an
-- existing, verified Supabase Auth user to the first LearnTrack Owner role.

begin;

do $$
declare
  -- Input: replace these values before executing in each environment.
  v_owner_email text := lower('REPLACE_WITH_VERIFIED_AUTH_EMAIL');
  v_owner_display_name text := 'LearnTrack Owner';
  v_organization_id text := 'learntrack-main';
  v_organization_name text := 'LearnTrack';

  v_auth_user_id uuid;
  v_profile_id text;
  v_membership_id text;
  v_owner_role_id text;
  v_permission_count integer;
begin
  if v_owner_email = 'replace_with_verified_auth_email' then
    raise exception 'Replace v_owner_email with an existing, verified Auth user email before running this script';
  end if;

  select id
    into strict v_auth_user_id
    from auth.users
   where lower(email) = v_owner_email
     and email_confirmed_at is not null;

  if exists (select 1 from public.organizations) then
    raise exception 'Initial Owner bootstrap only supports an empty LearnTrack organization set; review existing organizations and memberships first';
  end if;

  if exists (select 1 from public.profiles where auth_user_id = v_auth_user_id) then
    raise exception 'This Auth user is already linked to a LearnTrack profile; do not bootstrap it again';
  end if;

  select count(*) into v_permission_count from public.permissions;
  if v_permission_count = 0 then
    raise exception 'Permission catalog is empty; run 202609160001_identity_membership_and_audit.sql first';
  end if;

  v_profile_id := 'profile-owner-' || v_auth_user_id::text;
  v_membership_id := 'membership-owner-' || v_auth_user_id::text;
  v_owner_role_id := 'role-owner-' || v_organization_id;

  insert into public.organizations (id, name, status)
  values (v_organization_id, v_organization_name, 'active');

  insert into public.profiles (id, auth_user_id, display_name, login_email)
  values (v_profile_id, v_auth_user_id, v_owner_display_name, v_owner_email);

  insert into public.organization_memberships (
    id,
    organization_id,
    profile_id,
    status,
    activated_at
  )
  values (
    v_membership_id,
    v_organization_id,
    v_profile_id,
    'active',
    now()
  );

  insert into public.roles (id, organization_id, name, description, is_system)
  values (
    v_owner_role_id,
    v_organization_id,
    'Owner',
    'Initial organization owner',
    true
  );

  insert into public.role_permissions (organization_id, role_id, permission_code, scope_kind)
  select v_organization_id, v_owner_role_id, code, 'organization-wide'
    from public.permissions;

  insert into public.membership_roles (organization_id, membership_id, role_id)
  values (v_organization_id, v_membership_id, v_owner_role_id);

  insert into public.audit_logs (
    organization_id,
    actor_profile_id,
    actor_name,
    action,
    resource_type,
    resource_id,
    result,
    metadata
  )
  values (
    v_organization_id,
    v_profile_id,
    v_owner_display_name,
    'account.bootstrap_owner',
    'organization',
    v_organization_id,
    'succeeded',
    jsonb_build_object('bootstrap', true)
  );
end;
$$;

commit;
