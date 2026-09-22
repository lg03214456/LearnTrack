import "server-only";
import type {
  AuthorizationContext,
  CommandResult,
  PermissionCode,
} from "@/features/access-control/access-control.types";
import { accessStore } from "@/server/data/mock/access";
import { permissionCatalog } from "@/server/authorization/permission-catalog";
import { can, canManageOwner } from "@/server/authorization/policy";
const result = (ok: boolean, code: CommandResult["code"], message: string): CommandResult => ({
  ok,
  code,
  message,
});
export function updateAccount(
  actor: AuthorizationContext,
  input: { membershipId: string; roleId?: string; status?: "active" | "inactive" },
): CommandResult {
  if (!can(actor, "accounts.manage")) return result(false, "FORBIDDEN", "你沒有管理帳號的權限");
  const member = accessStore.memberships.find(
    (candidate) =>
      candidate.id === input.membershipId && candidate.organizationId === actor.organizationId,
  );
  const role = input.roleId
    ? accessStore.roles.find(
        (candidate) =>
          candidate.id === input.roleId && candidate.organizationId === actor.organizationId,
      )
    : undefined;
  if (!member || (input.roleId && !role)) return result(false, "NOT_FOUND", "找不到可管理的帳號");
  if ((member.roleId === "owner-role" || input.roleId === "owner-role") && !canManageOwner(actor))
    return result(false, "FORBIDDEN", "只有 Owner 可以管理 Owner 帳號");
  if (
    member.roleId === "owner-role" &&
    (input.status === "inactive" || (input.roleId && input.roleId !== member.roleId)) &&
    accessStore.memberships.filter(
      (candidate) => candidate.roleId === "owner-role" && candidate.status === "active",
    ).length === 1
  )
    return result(false, "CONFLICT", "不能停用或變更最後一位 Owner");
  accessStore.updateMembership({
    ...member,
    roleId: input.roleId ?? member.roleId,
    status: input.status ?? member.status,
  });
  return result(true, "OK", "帳號權限已更新");
}
export function updateRolePermissions(
  actor: AuthorizationContext,
  input: { roleId: string; version: number; permissions: PermissionCode[] },
): CommandResult {
  if (!can(actor, "roles.manage")) return result(false, "FORBIDDEN", "你沒有管理角色的權限");
  const role = accessStore.roles.find(
    (candidate) =>
      candidate.id === input.roleId && candidate.organizationId === actor.organizationId,
  );
  if (!role) return result(false, "NOT_FOUND", "找不到角色");
  if (role.isSystem) return result(false, "FORBIDDEN", "系統角色不可修改");
  if (role.version !== input.version) return result(false, "CONFLICT", "權限已被更新，請重新載入");
  const granted = new Set(input.permissions);
  for (const item of permissionCatalog)
    if (granted.has(item.code) && item.dependsOn) granted.add(item.dependsOn);
  accessStore.updateRole({ ...role, permissions: [...granted], version: role.version + 1 });
  return result(true, "OK", "角色權限已儲存");
}
export function inviteAccount(
  actor: AuthorizationContext,
  input: { name: string; email: string; roleId: string },
): CommandResult {
  if (!can(actor, "accounts.manage")) return result(false, "FORBIDDEN", "你沒有管理帳號的權限");
  if (!input.name.trim() || !input.email.includes("@"))
    return result(false, "VALIDATION_ERROR", "請輸入有效姓名與 Email");
  if (
    accessStore.profiles.some(
      (profile) => profile.email.toLowerCase() === input.email.toLowerCase(),
    )
  )
    return result(false, "CONFLICT", "Email 已存在");
  const role = accessStore.roles.find(
    (candidate) =>
      candidate.id === input.roleId && candidate.organizationId === actor.organizationId,
  );
  if (!role) return result(false, "NOT_FOUND", "找不到角色");
  if (role.id === "owner-role" && !canManageOwner(actor))
    return result(false, "FORBIDDEN", "只有 Owner 可以建立 Owner 帳號");
  const key = `invite-${Date.now()}`;
  accessStore.addProfile({
    id: key,
    authUserId: null,
    name: input.name.trim(),
    email: input.email.trim(),
    createdByProfileId: actor.profileId,
    createdAt: new Date().toISOString(),
  });
  accessStore.addMembership({
    id: `m-${key}`,
    organizationId: actor.organizationId,
    profileId: key,
    roleId: role.id,
    status: "inactive",
    classIds: [],
  });
  return result(true, "OK", "已建立 Mock 邀請帳號");
}
export function assignAccountClasses(
  actor: AuthorizationContext,
  input: { membershipId: string; classIds: string[] },
): CommandResult {
  if (!can(actor, "accounts.manage")) return result(false, "FORBIDDEN", "你沒有管理帳號的權限");
  const member = accessStore.memberships.find(
    (candidate) =>
      candidate.id === input.membershipId && candidate.organizationId === actor.organizationId,
  );
  if (!member) return result(false, "NOT_FOUND", "找不到可管理的帳號");
  if (member.roleId === "owner-role" && !canManageOwner(actor))
    return result(false, "FORBIDDEN", "只有 Owner 可以管理 Owner 帳號");
  accessStore.updateMembership({ ...member, classIds: [...new Set(input.classIds)] });
  return result(true, "OK", "班級範圍已更新");
}
