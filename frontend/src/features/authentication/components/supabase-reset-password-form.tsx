"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

type RecoveryState = "loading" | "ready" | "invalid" | "saving" | "error";

export function SupabaseResetPasswordForm() {
  const router = useRouter();
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    const initializeRecovery = async () => {
      const query = new URLSearchParams(window.location.search);
      const code = query.get("code");
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      let hasRecoverySession = false;

      if (code) {
        const { data, error } = await client.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
          setRecoveryState("invalid");
          return;
        }
        hasRecoverySession = true;
        query.delete("code");
      } else if (accessToken && refreshToken) {
        const { data, error } = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error || !data.session) {
          setRecoveryState("invalid");
          return;
        }
        hasRecoverySession = true;
      }

      if (hasRecoverySession) {
        const remainingQuery = query.toString();
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ""}`,
        );
        setRecoveryState("ready");
        return;
      }

      const { data, error } = await client.auth.getSession();
      setRecoveryState(!error && data.session ? "ready" : "invalid");
    };

    void initializeRecovery();
  }, []);

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("passwordConfirmation") ?? "");

    if (password.length < 12) {
      setMessage("密碼至少需要 12 個字元。");
      setRecoveryState("error");
      return;
    }
    if (password !== confirmation) {
      setMessage("兩次輸入的密碼不一致。");
      setRecoveryState("error");
      return;
    }

    setRecoveryState("saving");
    setMessage("");
    const client = getSupabaseBrowserClient();
    const { error } = await client.auth.updateUser({ password });
    if (error) {
      setMessage("目前無法更新密碼，請重新申請密碼連結。");
      setRecoveryState("error");
      return;
    }

    await client.auth.signOut();
    router.push("/login?reason=password-updated");
    router.refresh();
  }

  if (recoveryState === "loading")
    return <p className="mt-6 text-sm text-slate-600">正在驗證密碼連結…</p>;

  if (recoveryState === "invalid")
    return (
      <div className="mt-6 space-y-4">
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          連結無效或已過期，請重新申請。
        </p>
        <Link href="/password/forgot" className="btn-primary justify-center">
          重新申請連結
        </Link>
      </div>
    );

  return (
    <form onSubmit={handlePasswordReset} className="mt-6 space-y-4">
      <label htmlFor="supabase-new-password" className="block text-sm font-semibold text-slate-700">
        新密碼（至少 12 個字元）
      </label>
      <input
        id="supabase-new-password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        required
        autoFocus
        className="input w-full"
      />
      <label
        htmlFor="supabase-password-confirmation"
        className="block text-sm font-semibold text-slate-700"
      >
        再次輸入新密碼
      </label>
      <input
        id="supabase-password-confirmation"
        name="passwordConfirmation"
        type="password"
        autoComplete="new-password"
        minLength={12}
        required
        className="input w-full"
      />
      {message && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {message}
        </p>
      )}
      <button className="btn-primary w-full justify-center" disabled={recoveryState === "saving"}>
        {recoveryState === "saving" ? "更新中…" : "更新密碼"}
      </button>
    </form>
  );
}
