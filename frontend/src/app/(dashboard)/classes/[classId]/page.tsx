import { notFound } from "next/navigation";
import {
  completeClassSessionAction,
  openClassSessionAction,
} from "@/app/actions/class-session-actions";
import { PageHeader } from "@/components/page-header";
import { AccessDenied } from "@/features/access-control/components/access-denied";
import {
  ClassDailyWorkspaceView,
  ClassSessionHistory,
} from "@/features/class-sessions/components/class-daily-workspace";
import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";
import { classSessionRepository } from "@/server/repositories/class-session";

const isoToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ date?: string; notice?: string; tone?: string }>;
}) {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "progress.read")) return <AccessDenied />;
  const { classId } = await params;
  const query = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "") ? query.date! : isoToday();
  const data = classSessionRepository.open(actor, classId, date);
  if (!data) notFound();

  return (
    <>
      <PageHeader
        eyebrow="教學管理 / 課程班級 / 今日課堂"
        breadcrumbs={[{ label: "課程班級", href: "/classes" }, { label: "今日課堂" }]}
        title={`${data.session.className}・今日課堂`}
        description={`${data.session.sessionDate}｜${data.session.scheduleLabel}｜${data.session.teacherName}。依每位學生自己的教材版本登記本次進度。`}
      />
      {query.notice && (
        <div
          role="status"
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${query.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {query.notice}
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <form action={openClassSessionAction} className="flex items-end gap-2">
          <input type="hidden" name="classId" value={classId} />
          <label className="text-xs font-bold text-slate-600">
            課堂日期
            <input className="input mt-1" type="date" name="date" defaultValue={date} />
          </label>
          <button className="rounded-lg border px-3 py-2.5 text-sm font-bold">切換日期</button>
        </form>
        {data.canManage && data.session.status === "draft" && (
          <form action={completeClassSessionAction}>
            <input type="hidden" name="classId" value={classId} />
            <input type="hidden" name="sessionId" value={data.session.id} />
            <input type="hidden" name="sessionRevision" value={data.session.revision} />
            <input type="hidden" name="date" value={date} />
            <button className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800">
              完成今日課堂
            </button>
          </form>
        )}
      </div>
      <ClassDailyWorkspaceView data={data} />
      <ClassSessionHistory data={data} />
    </>
  );
}
