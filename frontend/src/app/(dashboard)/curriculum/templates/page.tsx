import { PageHeader } from "@/components/page-header";
import { AccessDenied } from "@/features/access-control/components/access-denied";
import { CurriculumDirectoryView } from "@/features/curriculum/components/curriculum-directory";
import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";
import { curriculumRepository } from "@/server/repositories/curriculum";
import type { CurriculumQuery, VersionStatus } from "@/features/curriculum/curriculum.types";
export default async function CurriculumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "curriculum.read")) return <AccessDenied />;
  const params = await searchParams;
  const status = params.status as VersionStatus | "archived" | undefined;
  const query: CurriculumQuery = {
    gradeId: params.gradeId,
    subjectId: params.subjectId,
    publisherId: params.publisherId,
    status: ["draft", "published", "archived"].includes(status ?? "") ? status : undefined,
  };
  return (
    <>
      <PageHeader
        eyebrow="教學管理 / 教材範本"
        title="教材與考卷範本庫"
        description="依年級、科目與版本維護可重複使用的學習內容。"
      />
      <CurriculumDirectoryView
        data={curriculumRepository.list(actor, query)}
        query={query}
        canManage={can(actor, "curriculum.manage")}
      />
    </>
  );
}
