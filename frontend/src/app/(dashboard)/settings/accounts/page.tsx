import { PageHeader } from "@/components/page-header";
import { AccountsView } from "@/features/access-control/components/accounts-view";
import { AccessDenied } from "@/features/access-control/components/access-denied";
import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";
import { listAccounts } from "@/server/repositories/access";
import { classRows } from "@/server/data/mock/fixtures";
export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "accounts.read")) return <AccessDenied />;
  const p = await searchParams;
  const page = Math.max(1, Number(p.page) || 1);
  const data = listAccounts(actor, {
    search: p.search,
    roleId: p.roleId,
    status: p.status === "active" || p.status === "inactive" ? p.status : undefined,
    page,
    pageSize: 20,
  });
  return (
    <>
      <PageHeader
        eyebrow="系統 / 帳號管理"
        title="帳號管理"
        description="管理人員角色、狀態與資料範圍；Owner 帳號僅能由 Owner 管理。"
      />
      <AccountsView
        data={data}
        canManageOwner={actor.roleId === "owner-role"}
        classes={classRows.map(({ id, name }) => ({ id, name }))}
      />
    </>
  );
}
