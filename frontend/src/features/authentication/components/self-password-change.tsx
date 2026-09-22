"use client";

import { useActionState } from "react";
import { requestSelfPasswordChangeAction } from "@/app/actions/authentication-actions";
import type { AuthenticationResult } from "../authentication.types";

const initialState: AuthenticationResult = { ok: false, code: "OK", message: "" };

export function SelfPasswordChange() {
  const [state, action, pending] = useActionState(requestSelfPasswordChangeAction, initialState);
  return (
    <form action={action} className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-bold text-slate-950">修改密碼</h2>
      <p className="mt-2 text-sm text-slate-500">系統會寄送單次、限時連結到你的登入信箱。</p>
      {state.message && (
        <p role="status" className="mt-4 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {state.message}
        </p>
      )}
      <button className="btn-primary mt-5" disabled={pending}>
        {pending ? "寄送中…" : "寄送修改密碼連結"}
      </button>
    </form>
  );
}
