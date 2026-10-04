import { PageHeader } from "@/components/page-header";
import { AnalyticsView } from "@/components/views/analytics-view";
import { AccessDenied } from "@/features/access-control/components/access-denied";
import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";
import { dashboardRepository } from "@/server/repositories/dashboard";
export default async function Page() {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "analytics.read")) return <AccessDenied />;
  const classIds = actor.scope.kind === "assigned-classes" ? actor.scope.classIds : undefined,
    analytics = await dashboardRepository.analytics(actor.organizationId, classIds);
  return (
    <>
      <PageHeader
        eyebrow="分析與設定 / 學習指標"
        title="學習表現總覽"
        description="掌握全校學生的學習趨勢、進度與各科表現。"
      />
      <AnalyticsView analytics={analytics} />
    </>
  );
}
