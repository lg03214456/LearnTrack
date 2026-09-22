-- Read-only verification after initialize-first-owner.sql succeeds.
-- Expected result: exactly one active Owner row and a permission_count that
-- matches the permission catalog count.

select
  p.display_name,
  p.login_email,
  m.status as membership_status,
  r.name as role_name,
  count(rp.permission_code) as permission_count,
  (select count(*) from public.permissions) as catalog_permission_count
from public.profiles p
join public.organization_memberships m on m.profile_id = p.id
join public.membership_roles mr
  on mr.membership_id = m.id
 and mr.organization_id = m.organization_id
join public.roles r
  on r.id = mr.role_id
 and r.organization_id = m.organization_id
left join public.role_permissions rp
  on rp.role_id = r.id
 and rp.organization_id = r.organization_id
where r.name = 'Owner'
group by p.display_name, p.login_email, m.status, r.name;

select
  action,
  result,
  resource_type,
  resource_id,
  created_at
from public.audit_logs
where action = 'account.bootstrap_owner'
order by created_at desc;
