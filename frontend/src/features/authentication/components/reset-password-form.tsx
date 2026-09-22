"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/authentication-actions";
import type { AuthenticationResult } from "../authentication.types";

const initialState: AuthenticationResult = { ok: false, code: "OK", message: "" };

export function ResetPasswordForm({ token, valid }: { token: string; valid: boolean }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);
  if (!valid)
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
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      <label htmlFor="new-password" className="block text-sm font-semibold text-slate-700">
        新密碼（至少 12 個字元）
      </label>
      <input
        id="new-password"
        name="password"
        type="password"
        minLength={12}
        required
        autoFocus
        className="input w-full"
      />
      <label htmlFor="password-confirmation" className="block text-sm font-semibold text-slate-700">
        再次輸入新密碼
      </label>
      <input
        id="password-confirmation"
        name="passwordConfirmation"
        type="password"
        minLength={12}
        required
        className="input w-full"
      />
      {state.message && !state.ok && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.message}
        </p>
      )}
      <button className="btn-primary w-full justify-center" disabled={pending}>
        {pending ? "更新中…" : "更新密碼"}
      </button>
    </form>
  );
}
