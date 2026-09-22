import { GraduationCap } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/authentication/components/login-form";
import { getAuthorizationContext } from "@/server/auth/identity";
import { authRuntimeConfig } from "@/server/auth/provider-config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const actor = await getAuthorizationContext().catch(() => null);
  if (actor) redirect("/students");
  const config = (() => {
    try {
      return authRuntimeConfig();
    } catch {
      return null;
    }
  })();
  const reason = (await searchParams).reason;
  const notice =
    reason === "session-expired"
      ? "登入階段已失效，請重新登入。"
      : reason === "logged-out"
        ? "你已安全登出。"
        : reason === "password-updated"
          ? "密碼已更新，請使用新密碼登入。"
          : undefined;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-5">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
        <div className="flex items-center gap-3">
          <span className="bg-brand grid size-11 place-items-center rounded-xl text-white">
            <GraduationCap aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-950">登入補教紀錄</h1>
            <p className="mt-1 text-sm text-slate-500">由機構 Owner 建立的帳號才能登入</p>
          </div>
        </div>
        <LoginForm
          isMockMode={config?.isMockMode ?? false}
          providerAvailable={Boolean(config)}
          notice={notice}
        />
      </section>
    </main>
  );
}
