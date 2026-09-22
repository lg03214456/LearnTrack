import "server-only";

import type {
  AccountStatus,
  AuthorizationContext,
  CommandResult,
} from "@/features/access-control/access-control.types";
import type {
  AuthProvider,
  EmailProvider,
  PasswordLinkProvider,
  SessionProvider,
} from "@/server/auth/contracts";
import { canManageOwner } from "@/server/authorization/policy";
import { accessStore } from "@/server/data/mock/access";
import { classRows } from "@/server/data/mock/fixtures";
import { updateAccount } from "./access-service";

interface AccountDependencies {
  auth: AuthProvider;
  email: EmailProvider;
  passwordLinks: PasswordLinkProvider;
  sessions: SessionProvider;
}

const result = (ok: boolean, code: CommandResult["code"], message: string): CommandResult => ({
  ok,
  code,
  message,
});
const target = (actor: AuthorizationContext, membershipId: string) => {
  const membership = accessStore.memberships.find(
    (candidate) =>
      candidate.id === membershipId && candidate.organizationId === actor.organizationId,
  );
  const profile = membership
    ? accessStore.profiles.find((candidate) => candidate.id === membership.profileId)
    : undefined;
  return membership && profile ? { membership, profile } : null;
};

export async function createOwnerManagedAccount(
  actor: AuthorizationContext,
  input: {
    name: string;
    email: string;
    initialPassword: string;
    roleId: string;
    status: AccountStatus;
    classIds: string[];
  },
  providers: AccountDependencies,
): Promise<CommandResult> {
  if (!canManageOwner(actor)) return result(false, "FORBIDDEN", "只有 Owner 可以建立登入帳號");
  if (
    !input.name.trim() ||
    !/^\S+@\S+\.\S+$/.test(input.email) ||
    input.initialPassword.length < 12
  )
    return result(false, "VALIDATION_ERROR", "請輸入姓名、有效信箱與至少 12 個字元的初始密碼");
  if (
    accessStore.profiles.some(
      (profile) => profile.email.toLowerCase() === input.email.toLowerCase(),
    )
  )
    return result(false, "CONFLICT", "登入信箱已存在");
  const role = accessStore.roles.find(
    (candidate) =>
      candidate.id === input.roleId && candidate.organizationId === actor.organizationId,
  );
  if (!role) return result(false, "NOT_FOUND", "找不到同機構角色");
  if (input.classIds.some((classId) => !classRows.some((classRow) => classRow.id === classId)))
    return result(false, "VALIDATION_ERROR", "資料範圍包含不存在的班級");

  const identity = await providers.auth.createIdentity({
    email: input.email,
    initialPassword: input.initialPassword,
    enabled: false,
  });
  if (!identity.ok)
    return result(
      false,
      identity.code === "CONFLICT" ? "CONFLICT" : "VALIDATION_ERROR",
      "無法建立登入身分",
    );
  const profileId = `profile-${crypto.randomUUID()}`;
  const membershipId = `membership-${crypto.randomUUID()}`;
  try {
    accessStore.addProfile({
      id: profileId,
      authUserId: identity.value.authUserId,
      name: input.name.trim(),
      email: identity.value.email,
      createdByProfileId: actor.profileId,
      createdAt: new Date().toISOString(),
    });
    accessStore.addMembership({
      id: membershipId,
      profileId,
      organizationId: actor.organizationId,
      roleId: role.id,
      status: input.status,
      classIds: [...new Set(input.classIds)],
    });
    if (input.status === "active") {
      const enabled = await providers.auth.setEnabled(identity.value.authUserId, true);
      if (!enabled.ok) throw new Error("AUTH_ENABLE_FAILED");
    }
    return result(true, "OK", "帳號已建立");
  } catch {
    accessStore.removeMembership(membershipId);
    accessStore.removeProfile(profileId);
    await providers.auth.removeIdentity(identity.value.authUserId);
    return result(false, "VALIDATION_ERROR", "帳號建立失敗，已安全回復變更");
  }
}

export async function changeManagedAccountEmail(
  actor: AuthorizationContext,
  input: { membershipId: string; email: string },
  providers: AccountDependencies,
): Promise<CommandResult> {
  if (!canManageOwner(actor)) return result(false, "FORBIDDEN", "只有 Owner 可以修改登入信箱");
  const account = target(actor, input.membershipId);
  if (!account?.profile.authUserId) return result(false, "NOT_FOUND", "找不到已連結的登入帳號");
  if (
    accessStore.profiles.some(
      (profile) =>
        profile.id !== account.profile.id &&
        profile.email.toLowerCase() === input.email.toLowerCase(),
    )
  )
    return result(false, "CONFLICT", "登入信箱已存在");
  const changed = await providers.auth.changeEmail(account.profile.authUserId, input.email);
  if (!changed.ok)
    return result(
      false,
      changed.code === "CONFLICT" ? "CONFLICT" : "VALIDATION_ERROR",
      "無法修改登入信箱",
    );
  accessStore.updateProfile({ ...account.profile, email: changed.value.email });
  return result(true, "OK", "登入信箱已更新");
}

export async function setManagedAccountStatus(
  actor: AuthorizationContext,
  input: { membershipId: string; status: AccountStatus },
  providers: AccountDependencies,
): Promise<CommandResult> {
  const account = target(actor, input.membershipId);
  if (!account?.profile.authUserId) return result(false, "NOT_FOUND", "找不到已連結的登入帳號");
  const validated = updateAccount(actor, input);
  if (!validated.ok) return validated;
  const providerResult = await providers.auth.setEnabled(
    account.profile.authUserId,
    input.status === "active",
  );
  if (!providerResult.ok) {
    accessStore.updateMembership(account.membership);
    return result(false, "VALIDATION_ERROR", "登入供應商無法更新帳號狀態");
  }
  if (input.status === "inactive") await providers.sessions.revokeAll(account.profile.authUserId);
  return validated;
}

export async function changeManagedAccountRole(
  actor: AuthorizationContext,
  input: { membershipId: string; roleId: string },
  providers: AccountDependencies,
): Promise<CommandResult> {
  const account = target(actor, input.membershipId);
  if (!account?.profile.authUserId) return result(false, "NOT_FOUND", "找不到已連結的登入帳號");
  const changed = updateAccount(actor, input);
  if (!changed.ok) return changed;
  await providers.sessions.revokeAll(account.profile.authUserId);
  return changed;
}

export async function sendManagedPasswordLink(
  actor: AuthorizationContext,
  input: { membershipId: string; purpose: "setup" | "recovery"; callbackBaseUrl: string },
  providers: AccountDependencies,
): Promise<CommandResult> {
  if (!canManageOwner(actor)) return result(false, "FORBIDDEN", "只有 Owner 可以重設他人密碼");
  const account = target(actor, input.membershipId);
  if (!account?.profile.authUserId) return result(false, "NOT_FOUND", "找不到已連結的登入帳號");
  if (input.purpose === "recovery") await providers.sessions.revokeAll(account.profile.authUserId);
  const link = await providers.passwordLinks.create(account.profile.authUserId, input.purpose);
  const sent = await providers.email.sendPasswordLink({
    recipient: account.profile.email,
    link,
    callbackUrl: `${input.callbackBaseUrl}/password/reset?token=${encodeURIComponent(link.token)}`,
  });
  return sent.ok
    ? result(true, "OK", "密碼連結已寄送")
    : result(false, "VALIDATION_ERROR", "密碼連結寄送失敗");
}

export async function revokeManagedAccountSessions(
  actor: AuthorizationContext,
  membershipId: string,
  providers: AccountDependencies,
): Promise<CommandResult> {
  if (!canManageOwner(actor)) return result(false, "FORBIDDEN", "只有 Owner 可以撤銷登入階段");
  const account = target(actor, membershipId);
  if (!account?.profile.authUserId) return result(false, "NOT_FOUND", "找不到已連結的登入帳號");
  await providers.sessions.revokeAll(account.profile.authUserId);
  return result(true, "OK", "所有登入階段已撤銷");
}
