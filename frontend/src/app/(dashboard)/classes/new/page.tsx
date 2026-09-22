import { PageHeader } from "@/components/page-header";
import { AccessDenied } from "@/features/access-control/components/access-denied";
import { ClassEditor } from "@/features/classes/components/class-editor";
import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";
import { classManagementRepository } from "@/server/repositories/class-management";
export default async function Page() {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "classes.manage") || actor.scope.kind !== "organization-wide")
    return <AccessDenied />;
  const view = await classManagementRepository.editor(actor);
  return (
    <>
      <PageHeader
        eyebrow="教學管理 / 課程班級"
        breadcrumbs={[{ label: "課程班級", href: "/classes" }, { label: "新增班級" }]}
        title="新增班級"
        description="設定基本資料、排課時段、授課教師與初始學生。"
      />
      <ClassEditor view={view!} />
    </>
  );
}
