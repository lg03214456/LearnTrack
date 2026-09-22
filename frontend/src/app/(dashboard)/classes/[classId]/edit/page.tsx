import { PageHeader } from "@/components/page-header";
import { AccessDenied } from "@/features/access-control/components/access-denied";
import { ClassEditor } from "@/features/classes/components/class-editor";
import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";
import { classManagementRepository } from "@/server/repositories/class-management";
export default async function Page({ params }: { params: Promise<{ classId: string }> }) {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "classes.manage")) return <AccessDenied />;
  const { classId } = await params,
    view = await classManagementRepository.editor(actor, classId);
  if (!view) return <AccessDenied />;
  return (
    <>
      <PageHeader
        eyebrow="教學管理 / 課程班級"
        breadcrumbs={[{ label: "課程班級", href: "/classes" }, { label: "編輯班級" }]}
        title={`編輯 ${view.initial.name}`}
        description="修改班級設定、排課、教師與學生名單。"
      />
      <ClassEditor view={view} />
    </>
  );
}
