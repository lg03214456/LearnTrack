import { PageHeader } from "@/components/page-header";
import { ProgressView } from "@/components/views/progress-view";
import { AccessDenied } from "@/features/access-control/components/access-denied";
import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";
import { dashboardRepository } from "@/server/repositories/dashboard";
export default async function Page() {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "progress.read")) return <AccessDenied />;
  const classIds = actor.scope.kind === "assigned-classes" ? actor.scope.classIds : undefined,
    studentIds =
      actor.scope.kind === "self-student"
        ? [actor.scope.studentId]
        : actor.scope.kind === "linked-students"
          ? actor.scope.studentIds
          : undefined,
    progressRows = await dashboardRepository.progress(actor.organizationId, classIds),
    scopedProgressRows = studentIds
      ? progressRows.filter((row) => studentIds.includes(row.studentId))
      : progressRows;
  return (
    <>
      <PageHeader
        eyebrow="教學管理 / 學生進度"
        title="學生進度紀錄"
        description="掌握授權範圍內的學習狀況、課程進度與近期表現。"
      />
      <ProgressView rows={scopedProgressRows} />
    </>
  );
}
