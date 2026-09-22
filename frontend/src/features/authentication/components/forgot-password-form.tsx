"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { forgotPasswordAction } from "@/app/actions/authentication-actions";
import type { AuthenticationResult } from "../authentication.types";

const initialState: AuthenticationResult = { ok: false, code: "OK", message: "" };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!state.cooldownSeconds) return;
    const now = Date.now();
    setCurrentTime(now);
    setCooldownUntil(now + state.cooldownSeconds * 1000);
  }, [state.cooldownSeconds]);

  useEffect(() => {
    if (!cooldownUntil) return;
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const remainingSeconds = cooldownUntil
    ? Math.max(0, Math.ceil((cooldownUntil - currentTime) / 1000))
    : 0;
  const isCoolingDown = remainingSeconds > 0;
  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label htmlFor="recovery-email" className="block text-sm font-semibold text-slate-700">
        登入信箱
      </label>
      <input
        id="recovery-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        autoFocus
        className="input w-full"
      />
      {state.message && (
        <p role="status" className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {state.message}
        </p>
      )}
      <button className="btn-primary w-full justify-center" disabled={pending || isCoolingDown}>
        {pending
          ? "處理中…"
          : isCoolingDown
            ? `${remainingSeconds} 秒後可重新寄送`
            : "寄送密碼連結"}
      </button>
      <Link
        href="/login"
        className="block text-center text-sm font-semibold text-slate-600 hover:underline"
      >
        返回登入
      </Link>
    </form>
  );
}
