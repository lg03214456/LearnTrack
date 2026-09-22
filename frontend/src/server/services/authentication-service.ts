import "server-only";

import type { AuthenticationResult } from "@/features/authentication/authentication.types";
import type { AuthProvider, MembershipRepository, SessionProvider } from "@/server/auth/contracts";

interface LoginDependencies {
  auth: AuthProvider;
  memberships: MembershipRepository;
  sessions: SessionProvider;
}

export async function authenticateAccount(
  input: { email: string; password: string },
  providers: LoginDependencies,
): Promise<AuthenticationResult & { sessionId?: string; expiresAt?: string }> {
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim()) || !input.password)
    return { ok: false, code: "VALIDATION_ERROR", message: "請輸入有效的電子郵件與密碼。" };

  const authenticated = await providers.auth.authenticate(input.email, input.password);
  if (!authenticated.ok)
    return {
      ok: false,
      code: authenticated.code === "ACCOUNT_DISABLED" ? "ACCOUNT_DISABLED" : "INVALID_CREDENTIALS",
      message: "無法登入，請確認帳號狀態或登入資料。",
    };

  const actor = await providers.memberships.resolveByAuthUserId(authenticated.value.authUserId);
  if (!actor || actor.status !== "active")
    return {
      ok: false,
      code: "ACCOUNT_DISABLED",
      message: "無法登入，請確認帳號狀態或登入資料。",
    };

  const session = await providers.sessions.create(
    authenticated.value.authUserId,
    authenticated.value.session,
  );
  return {
    ok: true,
    code: "OK",
    message: "登入成功。",
    redirectTo: "/students",
    sessionId: session.id,
    expiresAt: session.expiresAt,
  };
}
