import Link from "next/link";
import { headers } from "next/headers";
import { Building2, Eye, GraduationCap, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/authentication-actions";
import { getAuthenticatedActor } from "@/server/auth/identity";
import {
  listActiveOrganizations,
  resolveOrganizationSummary,
} from "@/server/organizations/organization-context";
import { appendPlatformAuditEvent } from "@/server/audit/platform-audit-repository";

export default async function PlatformPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string }>;
}) {
  const actor = await getAuthenticatedActor();
  if (actor.actorType !== "platform") return null;
  const organizations = await listActiveOrganizations(actor);
  const requestedId = (await searchParams).organizationId;
  const selected = requestedId ? await resolveOrganizationSummary(actor, requestedId) : null;
  if (requestedId) {
    const requestId = (await headers()).get("x-request-id") ?? undefined;
    await appendPlatformAuditEvent({
      actor,
      targetOrganizationId: selected?.id,
      action: selected ? "platform.organization.inspect" : "platform.organization.inspect_denied",
      result: selected ? "succeeded" : "denied",
      requestId,
    });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <span className="bg-brand rounded-lg p-2 text-white">
            <GraduationCap />
          </span>
          <div>
            <b>{selected?.name ?? "LearnTrack 平台管理"}</b>
            <small className="block text-slate-500">Platform Owner・唯讀管理</small>
          </div>
          <form action={logoutAction} className="ml-auto">
            <button className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <LogOut size={16} />
              登出
            </button>
          </form>
        </div>
      </header>
      {selected && (
        <div
          role="status"
          className="border-b border-sky-200 bg-sky-50 px-6 py-3 text-center text-sm font-semibold text-sky-900"
        >
          <Eye className="mr-2 inline" size={17} />
          正在唯讀檢視：{selected.name}
          <Link href="/platform" className="ml-3 underline">
            結束檢視
          </Link>
        </div>
      )}
      <div className="mx-auto max-w-6xl p-6 lg:p-10">
        <h1 className="text-2xl font-bold">機構清單</h1>
        <p className="mt-2 text-sm text-slate-600">
          選擇機構後才會建立明確的檢視範圍；平台帳號不能修改租戶資料。
        </p>
        {requestedId && !selected && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            找不到可用的機構，未開啟任何租戶資料。
          </p>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((organization) => (
            <Link
              key={organization.id}
              href={`/platform?organizationId=${encodeURIComponent(organization.id)}`}
              className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-sky-400"
            >
              <Building2 className="text-brand" />
              <b className="mt-3 block">{organization.name}</b>
              <small className="text-slate-500">唯讀檢視</small>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
