import { PageHeader } from "@/components/page-header";
import { AccessDenied } from "@/features/access-control/components/access-denied";
import { RolesView } from "@/features/access-control/components/roles-view";
import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";
import { listRoles } from "@/server/repositories/access";
import { permissionCatalog } from "@/server/authorization/permission-catalog";
export default async function RolesPage() {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "roles.read")) return <AccessDenied />;
  return (
    <>
      <PageHeader
        eyebrow="系統 / 角色權限"
        title="權限設定"
        description="選擇角色並設定可查看、管理的功能範圍。"
      />
      <RolesView
        roles={listRoles(actor)}
        permissions={permissionCatalog}
        canManage={can(actor, "roles.manage")}
      />
    </>
  );
}
