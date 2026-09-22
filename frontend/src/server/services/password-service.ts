import "server-only";

import type { AuthenticationResult } from "@/features/authentication/authentication.types";
import type {
  AuthProvider,
  EmailProvider,
  MembershipRepository,
  PasswordLinkProvider,
  SessionProvider,
} from "@/server/auth/contracts";

interface PasswordDependencies {
  auth: AuthProvider;
  email: EmailProvider;
  memberships: MembershipRepository;
  passwordLinks: PasswordLinkProvider;
  sessions: SessionProvider;
}

const recoveryConfirmation: AuthenticationResult = {
  ok: true,
  code: "OK",
  message: "若此信箱可使用，我們已寄出密碼設定連結。",
};

export async function requestPasswordRecovery(
  email: string,
  callbackBaseUrl: string,
  providers: PasswordDependencies,
): Promise<AuthenticationResult> {
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return recoveryConfirmation;
  const identity = await providers.auth.findIdentityByEmail(email);
  if (!identity) return recoveryConfirmation;
  const actor = await providers.memberships.resolveByAuthUserId(identity.authUserId);
  if (!actor || actor.status !== "active") return recoveryConfirmation;

  const link = await providers.passwordLinks.create(identity.authUserId, "recovery");
  await providers.email.sendPasswordLink({
    recipient: identity.email,
    link,
    callbackUrl: `${callbackBaseUrl}/password/reset?token=${encodeURIComponent(link.token)}`,
  });
  return recoveryConfirmation;
}

export async function requestSelfPasswordChange(
  actor: import("@/features/access-control/access-control.types").AuthorizationContext,
  callbackBaseUrl: string,
  providers: PasswordDependencies,
): Promise<AuthenticationResult> {
  if (!actor.permissions.includes("credentials.change_self"))
    return { ok: false, code: "FORBIDDEN", message: "你沒有修改密碼的權限。" };
  const authUserId = await providers.memberships.findAuthUserId(actor.profileId);
  if (!authUserId)
    return { ok: false, code: "PROVIDER_UNAVAILABLE", message: "此帳號尚未連結登入身分。" };
  const link = await providers.passwordLinks.create(authUserId, "change");
  const sent = await providers.email.sendPasswordLink({
    recipient: actor.email,
    link,
    callbackUrl: `${callbackBaseUrl}/password/reset?token=${encodeURIComponent(link.token)}`,
  });
  return sent.ok
    ? { ok: true, code: "OK", message: "修改密碼連結已寄送至你的登入信箱。" }
    : { ok: false, code: "PROVIDER_UNAVAILABLE", message: "目前無法寄送連結，請稍後再試。" };
}

export async function validatePasswordLink(
  token: string,
  providers: PasswordDependencies,
): Promise<boolean> {
  const link = await providers.passwordLinks.find(token);
  if (!link) return false;
  const actor = await providers.memberships.resolveByAuthUserId(link.authUserId);
  return Boolean(actor && actor.status === "active");
}

export async function replacePasswordFromLink(
  input: { token: string; password: string },
  providers: PasswordDependencies,
): Promise<AuthenticationResult> {
  if (input.password.length < 12)
    return { ok: false, code: "VALIDATION_ERROR", message: "密碼至少需要 12 個字元。" };
  const link = await providers.passwordLinks.find(input.token);
  if (!link) return { ok: false, code: "LINK_INVALID", message: "連結無效或已過期，請重新申請。" };
  const actor = await providers.memberships.resolveByAuthUserId(link.authUserId);
  if (!actor || actor.status !== "active")
    return { ok: false, code: "LINK_INVALID", message: "連結無效或已過期，請重新申請。" };

  const changed = await providers.auth.replacePassword(link.authUserId, input.password);
  if (!changed.ok)
    return { ok: false, code: "PROVIDER_UNAVAILABLE", message: "目前無法更新密碼，請稍後再試。" };
  if (!(await providers.passwordLinks.consume(input.token)))
    return { ok: false, code: "LINK_INVALID", message: "連結無效或已過期，請重新申請。" };
  await providers.sessions.revokeAll(link.authUserId);
  return { ok: true, code: "OK", message: "密碼已更新，請使用新密碼登入。", redirectTo: "/login" };
}
