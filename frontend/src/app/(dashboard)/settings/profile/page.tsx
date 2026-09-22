import { PageHeader } from "@/components/page-header";
import { SelfPasswordChange } from "@/features/authentication/components/self-password-change";
import { getAuthorizationContext } from "@/server/auth/identity";

export default async function PersonalProfilePage() {
  const actor = await getAuthorizationContext();
  return (
    <>
      <PageHeader
        eyebrow="系統設定 / 個人資料"
        title="個人資料"
        description="查看登入身分與管理自己的登入安全。"
      />
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-950">帳號資訊</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">姓名</dt>
              <dd className="font-semibold">{actor.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">登入信箱</dt>
              <dd className="font-semibold">{actor.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">角色</dt>
              <dd className="font-semibold">{actor.roleName}</dd>
            </div>
          </dl>
        </section>
        <SelfPasswordChange />
      </div>
    </>
  );
}
