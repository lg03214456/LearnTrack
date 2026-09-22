import { PageHeader } from "@/components/page-header";
import { AccessDenied } from "@/features/access-control/components/access-denied";
import { auditResults } from "@/features/audit-log/audit-log.types";
import { auditActions } from "@/server/audit/audit-catalog";
import { getAuthorizationContext } from "@/server/auth/identity";
import { getAuthProviders } from "@/server/auth/providers";
import { can } from "@/server/authorization/policy";
import Link from "next/link";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "audit.read") || actor.scope.kind !== "organization-wide")
    return <AccessDenied />;
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const result = auditResults.includes(query.result as (typeof auditResults)[number])
    ? (query.result as (typeof auditResults)[number])
    : undefined;
  const data = await getAuthProviders().audit.list({
    organizationId: actor.organizationId,
    actorProfileId: query.actor || undefined,
    action: query.action || undefined,
    resourceType: query.resource || undefined,
    result,
    from: query.from ? new Date(`${query.from}T00:00:00`).toISOString() : undefined,
    to: query.to ? new Date(`${query.to}T23:59:59.999`).toISOString() : undefined,
    page,
    pageSize: 25,
  });
  const pageHref = (nextPage: number) => {
    const parameters = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value && key !== "page") parameters.set(key, value);
    });
    parameters.set("page", String(nextPage));
    return `/settings/audit?${parameters}`;
  };
  return (
    <>
      <PageHeader
        eyebrow="系統 / 操作紀錄"
        title="操作紀錄"
        description="依機構範圍查閱登入、安全與重要資料異動；紀錄不可修改或刪除。"
      />
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <form className="grid gap-3 border-b bg-slate-50 p-4 md:grid-cols-3 xl:grid-cols-6">
          <input
            name="from"
            type="date"
            defaultValue={query.from}
            aria-label="開始日期"
            className="input"
          />
          <input
            name="to"
            type="date"
            defaultValue={query.to}
            aria-label="結束日期"
            className="input"
          />
          <input
            name="actor"
            defaultValue={query.actor}
            placeholder="操作者 ID"
            aria-label="操作者"
            className="input"
          />
          <select name="action" defaultValue={query.action} aria-label="動作" className="input">
            <option value="">全部動作</option>
            {auditActions.map((action) => (
              <option key={action}>{action}</option>
            ))}
          </select>
          <input
            name="resource"
            defaultValue={query.resource}
            placeholder="資源類型"
            aria-label="資源"
            className="input"
          />
          <select name="result" defaultValue={query.result} aria-label="結果" className="input">
            <option value="">全部結果</option>
            {auditResults.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button className="btn-primary justify-center md:col-span-3 xl:col-span-6">
            套用篩選
          </button>
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>時間</th>
                <th>操作者</th>
                <th>動作</th>
                <th>資源</th>
                <th>結果</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString("zh-TW")}</td>
                  <td>{row.actorName}</td>
                  <td>{row.action}</td>
                  <td>
                    {row.resourceType}
                    {row.resourceId ? ` · ${row.resourceId}` : ""}
                  </td>
                  <td>{row.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.rows.length && (
          <p className="p-10 text-center text-sm text-slate-500">目前沒有符合條件的操作紀錄</p>
        )}
        <div className="flex items-center justify-between border-t p-4 text-xs text-slate-500">
          <p>
            第 {page} 頁，共 {data.total} 筆；每頁 25 筆
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link className="rounded border px-3 py-1" href={pageHref(page - 1)}>
                上一頁
              </Link>
            )}
            {page * 25 < data.total && (
              <Link className="rounded border px-3 py-1" href={pageHref(page + 1)}>
                下一頁
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
