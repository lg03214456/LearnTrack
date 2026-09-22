import { PageHeader } from "@/components/page-header";
import { AccessDenied } from "@/features/access-control/components/access-denied";
import { ClassesView } from "@/features/classes/components/classes-view";
import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";
import { classManagementRepository } from "@/server/repositories/class-management";
export default async function Page() {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "classes.read")) return <AccessDenied />;
  const rows = await classManagementRepository.list(actor);
  return (
    <>
      <PageHeader
        eyebrow="教學管理 / 課程班級"
        title="課程班級"
        description="管理所有班級、授課安排、學生名單與課程進度。"
      />
      <ClassesView
        rows={rows}
        canCreate={actor.scope.kind === "organization-wide" && can(actor, "classes.manage")}
      />
    </>
  );
}
