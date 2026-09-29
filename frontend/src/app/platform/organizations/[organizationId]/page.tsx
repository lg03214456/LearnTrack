import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Users } from "lucide-react";
import { getAuthenticatedActor, SESSION_COOKIE } from "@/server/auth/identity";
import { platformInspectionAudit } from "@/server/audit/platform-audit-repository";
import { supabasePlatformInspectionRepository } from "@/server/repositories/platform-inspection";
import { inspectPlatformOrganization } from "@/server/services/platform-inspection-service";
import { PlatformContextBranding } from "@/features/platform-inspection/components/platform-context-branding";

export default async function PlatformOrganizationPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const actor = await getAuthenticatedActor();
  if (actor.actorType !== "platform") return null;
  const organizationId = decodeURIComponent((await params).organizationId);
  const accessToken = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  const requestId = (await headers()).get("x-request-id") ?? undefined;
  const snapshot = await inspectPlatformOrganization({
    actor,
    targetOrganizationId: organizationId,
    accessToken,
    requestId,
    repository: supabasePlatformInspectionRepository,
    audit: platformInspectionAudit,
  }).catch(() => notFound());

  return (
    <main className="min-h-screen bg-slate-50">
      <PlatformContextBranding
        organizationName={snapshot.organization.name}
        action={
          <Link href="/platform" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft size={16} />
            返回機構清單
          </Link>
        }
      />
      <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-10">
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border bg-white p-5">
            <Users className="text-brand" />
            <p className="mt-3 text-sm text-slate-500">學生總數</p>
            <strong className="text-3xl">{snapshot.students.length}</strong>
          </section>
          <section className="rounded-xl border bg-white p-5">
            <BookOpen className="text-brand" />
            <p className="mt-3 text-sm text-slate-500">班級總數</p>
            <strong className="text-3xl">{snapshot.classes.length}</strong>
          </section>
        </div>
        <section>
          <h1 className="text-xl font-bold">學生名單</h1>
          <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3">學號</th>
                  <th className="p-3">姓名</th>
                  <th className="p-3">狀態</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.students.map((student) => (
                  <tr key={student.id} className="border-b last:border-0">
                    <td className="p-3">{student.studentNumber}</td>
                    <td className="p-3 font-medium">{student.displayName}</td>
                    <td className="p-3">{student.status}</td>
                  </tr>
                ))}
                {!snapshot.students.length && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-slate-500">
                      尚無學生資料
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className="text-xl font-bold">班級清單</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3">班級名稱</th>
                  <th className="p-3">狀態</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.classes.map((courseClass) => (
                  <tr key={courseClass.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{courseClass.name}</td>
                    <td className="p-3">{courseClass.status}</td>
                  </tr>
                ))}
                {!snapshot.classes.length && (
                  <tr>
                    <td colSpan={2} className="p-6 text-center text-slate-500">
                      尚無班級資料
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
