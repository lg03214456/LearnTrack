"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthenticationResult } from "@/features/authentication/authentication.types";
import { getAuthorizationContext, SESSION_COOKIE } from "@/server/auth/identity";
import { getAuthProviders } from "@/server/auth/providers";
import { authenticateAccount } from "@/server/services/authentication-service";
import {
  replacePasswordFromLink,
  requestPasswordRecovery,
  requestSelfPasswordChange,
} from "@/server/services/password-service";
import { appendAuditEvent, executeAuditedCommit } from "@/server/audit/audit-service";
import { startPasswordEmailCooldown } from "@/server/auth/password-email-cooldown";

export async function loginAction(
  _previous: AuthenticationResult,
  formData: FormData,
): Promise<AuthenticationResult> {
  let providers: ReturnType<typeof getAuthProviders>;
  try {
    providers = getAuthProviders();
  } catch {
    return {
      ok: false,
      code: "PROVIDER_UNAVAILABLE",
      message: "登入服務目前無法使用，請聯絡系統管理者。",
    };
  }
  const email = String(formData.get("email") ?? "");
  const targetIdentity = await providers.auth.findIdentityByEmail(email);
  const targetActor = targetIdentity
    ? await providers.memberships.resolveByAuthUserId(targetIdentity.authUserId)
    : null;
  await providers.audit.assertWritable();
  const result = await authenticateAccount(
    {
      email,
      password: String(formData.get("password") ?? ""),
    },
    providers,
  );
  await appendAuditEvent(providers.audit, {
    actor: result.ok ? (targetActor ?? undefined) : undefined,
    organizationId: targetActor?.organizationId ?? "authentication",
    action: "auth.login",
    resourceType: "session",
    resourceId: targetActor?.profileId,
    result: result.ok ? "succeeded" : "denied",
    metadata: result.ok ? {} : { reasonCode: result.code },
  });
  if (!result.ok || !result.sessionId || !result.expiresAt) return result;

  (await cookies()).set(SESSION_COOKIE, result.sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(result.expiresAt),
  });
  redirect(result.redirectTo ?? "/students");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  const actor = await getAuthorizationContext().catch(() => null);
  const providers = getAuthProviders();
  if (sessionId && actor)
    await executeAuditedCommit({
      repository: providers.audit,
      event: {
        actor,
        organizationId: actor.organizationId,
        action: "auth.logout",
        resourceType: "session",
        result: "succeeded",
      },
      commit: () => providers.sessions.revoke(sessionId),
    });
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login?reason=logged-out");
}

export async function forgotPasswordAction(
  _previous: AuthenticationResult,
  formData: FormData,
): Promise<AuthenticationResult> {
  try {
    const requestHeaders = await headers();
    const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
    const providers = getAuthProviders();
    await providers.audit.assertWritable();
    const email = String(formData.get("email") ?? "");
    const cooldown = startPasswordEmailCooldown(email);
    if (!cooldown.allowed)
      return {
        ok: true,
        code: "OK",
        message: "若此信箱可使用，我們已寄出密碼設定連結。",
        cooldownSeconds: cooldown.retryAfterSeconds,
      };
    const identity = await providers.auth.findIdentityByEmail(email);
    const targetActor = identity
      ? await providers.memberships.resolveByAuthUserId(identity.authUserId)
      : null;
    const result = await requestPasswordRecovery(email, origin, providers);
    await appendAuditEvent(providers.audit, {
      organizationId: targetActor?.organizationId ?? "authentication",
      action: "password.reset_requested",
      resourceType: "account",
      resourceId: targetActor?.profileId,
      result: "succeeded",
    });
    return { ...result, cooldownSeconds: cooldown.retryAfterSeconds };
  } catch {
    return {
      ok: false,
      code: "PROVIDER_UNAVAILABLE",
      message: "密碼服務目前無法使用，請聯絡系統管理者。",
    };
  }
}

export async function resetPasswordAction(
  _previous: AuthenticationResult,
  formData: FormData,
): Promise<AuthenticationResult> {
  const password = String(formData.get("password") ?? "");
  if (password !== String(formData.get("passwordConfirmation") ?? ""))
    return { ok: false, code: "VALIDATION_ERROR", message: "兩次輸入的密碼不一致。" };
  let result: AuthenticationResult;
  try {
    const providers = getAuthProviders();
    await providers.audit.assertWritable();
    const link = await providers.passwordLinks.find(String(formData.get("token") ?? ""));
    const targetActor = link
      ? await providers.memberships.resolveByAuthUserId(link.authUserId)
      : null;
    result = await replacePasswordFromLink(
      { token: String(formData.get("token") ?? ""), password },
      providers,
    );
    await appendAuditEvent(providers.audit, {
      actor: targetActor ?? undefined,
      organizationId: targetActor?.organizationId ?? "authentication",
      action: "password.changed",
      resourceType: "account",
      resourceId: targetActor?.profileId,
      result: result.ok ? "succeeded" : "denied",
      metadata: result.ok ? {} : { reasonCode: result.code },
    });
  } catch {
    return {
      ok: false,
      code: "PROVIDER_UNAVAILABLE",
      message: "密碼服務目前無法使用，請聯絡系統管理者。",
    };
  }
  if (result.ok) redirect("/login?reason=password-updated");
  return result;
}

export async function requestSelfPasswordChangeAction(
  _previous: AuthenticationResult,
): Promise<AuthenticationResult> {
  void _previous;
  try {
    const actor = await getAuthorizationContext();
    const requestHeaders = await headers();
    const providers = getAuthProviders();
    await providers.audit.assertWritable();
    const result = await requestSelfPasswordChange(
      actor,
      requestHeaders.get("origin") ?? "http://localhost:3000",
      providers,
    );
    await appendAuditEvent(providers.audit, {
      actor,
      organizationId: actor.organizationId,
      action: "password.reset_requested",
      resourceType: "account",
      resourceId: actor.profileId,
      result: result.ok ? "succeeded" : "denied",
      metadata: result.ok ? {} : { reasonCode: result.code },
    });
    return result;
  } catch {
    return { ok: false, code: "FORBIDDEN", message: "無法驗證登入狀態，請重新登入。" };
  }
}
