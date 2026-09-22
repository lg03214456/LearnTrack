import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { AccessDenied } from "@/features/access-control/components/access-denied";
import { CurriculumDetailView } from "@/features/curriculum/components/curriculum-detail";
import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";
import { curriculumRepository } from "@/server/repositories/curriculum";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ versionId: string }>;
  searchParams: Promise<{ notice?: string; tone?: string }>;
}) {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "curriculum.read")) return <AccessDenied />;
  const data = curriculumRepository.detail(actor, (await params).versionId),
    query = await searchParams;
  if (!data) notFound();
  return (
    <>
      <PageHeader
        eyebrow="教材範本 / 版本內容"
        breadcrumbs={[{ label: "教材範本", href: "/curriculum/templates" }, { label: "版本內容" }]}
        title={data.template.name}
        description="發布後內容不可變；調整時請建立新草稿版本。"
      />
      {query.notice && (
        <p
          role="status"
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${query.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {query.notice}
        </p>
      )}
      <CurriculumDetailView data={data} canManage={can(actor, "curriculum.manage")} />
    </>
  );
}
