import { ForgotPasswordForm } from "@/features/authentication/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-5">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
        <h1 className="text-2xl font-bold text-slate-950">忘記密碼</h1>
        <p className="mt-2 text-sm text-slate-500">輸入登入信箱；系統不會顯示該帳號是否存在。</p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
