import { ResetPasswordForm } from "@/features/authentication/components/reset-password-form";
import { getAuthProviders } from "@/server/auth/providers";
import { validatePasswordLink } from "@/server/services/password-service";
import { authRuntimeConfig } from "@/server/auth/provider-config";
import { SupabaseResetPasswordForm } from "@/features/authentication/components/supabase-reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? "";
  const usesSupabase = authRuntimeConfig().authProvider === "supabase";
  const valid = usesSupabase
    ? false
    : await validatePasswordLink(token, getAuthProviders()).catch(() => false);
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-5">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
        <h1 className="text-2xl font-bold text-slate-950">設定新密碼</h1>
        <p className="mt-2 text-sm text-slate-500">
          此連結只能使用一次，完成後其他登入階段將失效。
        </p>
        {usesSupabase ? (
          <SupabaseResetPasswordForm />
        ) : (
          <ResetPasswordForm token={token} valid={valid} />
        )}
      </section>
    </main>
  );
}
