import Link from "next/link";
import { cookies } from "next/headers";
import { Building2, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/authentication-actions";
import { getAuthenticatedActor, SESSION_COOKIE } from "@/server/auth/identity";
import { listActiveOrganizations } from "@/server/organizations/organization-context";
import { PlatformContextBranding } from "@/features/platform-inspection/components/platform-context-branding";

export default async function PlatformPage() {
  const actor = await getAuthenticatedActor();
  if (actor.actorType !== "platform") return null;
  const accessToken = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  const organizations = await listActiveOrganizations(actor, accessToken);

  return (
    <main className="min-h-screen bg-slate-50">
      <PlatformContextBranding
        action={
          <form action={logoutAction}>
            <button className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <LogOut size={16} />
              登出
            </button>
          </form>
        }
      />
      <div className="mx-auto max-w-6xl p-6 lg:p-10">
        <h1 className="text-2xl font-bold">機構清單</h1>
        <p className="mt-2 text-sm text-slate-600">
          選擇機構後才會載入該機構的唯讀資料；平台帳號不能修改租戶資料。
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((organization) => (
            <Link
              key={organization.id}
              href={`/platform/organizations/${encodeURIComponent(organization.id)}`}
              className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-sky-400"
            >
              <Building2 className="text-brand" />
              <b className="mt-3 block">{organization.name}</b>
              <small className="text-slate-500">進入唯讀檢視</small>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
