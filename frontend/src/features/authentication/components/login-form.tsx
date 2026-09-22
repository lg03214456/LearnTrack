"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/authentication-actions";
import Link from "next/link";
import type { AuthenticationResult } from "../authentication.types";

const initialState: AuthenticationResult = { ok: false, code: "OK", message: "" };

export function LoginForm({
  isMockMode,
  providerAvailable = true,
  notice,
}: {
  isMockMode: boolean;
  providerAvailable?: boolean;
  notice?: string;
}) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  return (
    <form action={formAction} className="mt-8 space-y-5" aria-label="帳號登入">
      {notice && (
        <p role="status" className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {notice}
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
          登入信箱
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          className="input w-full"
          placeholder="name@example.com"
        />
        <div className="mt-2 text-right">
          <Link
            href="/password/forgot"
            className="text-brand text-sm font-semibold hover:underline"
          >
            忘記密碼？
          </Link>
        </div>
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
          密碼
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input w-full"
        />
      </div>
      {state.message && !state.ok && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.message}
        </p>
      )}
      {!providerAvailable && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          正式登入服務尚未完成設定，系統已停止登入以保護資料。
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !providerAvailable}
        className="btn-primary w-full justify-center"
      >
        {pending ? "登入中…" : providerAvailable ? "登入" : "登入服務未設定"}
      </button>
      {isMockMode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <b>Mock 測試帳號</b>
          <p className="mt-1">owner@learntrack.test / Demo-Owner-2026!</p>
          <p className="mt-1">僅供本機流程驗證，請勿輸入真實帳密。</p>
        </div>
      )}
    </form>
  );
}
