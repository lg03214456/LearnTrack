"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PermissionCode } from "@/features/access-control/access-control.types";
import { getAuthorizationContext, SESSION_COOKIE } from "@/server/auth/identity";
import { authRuntimeConfig } from "@/server/auth/provider-config";
import { mockSessionProvider } from "@/server/auth/mock-providers";
import { accessStore } from "@/server/data/mock/access";
import { updateRolePermissions } from "@/server/services/access-service";
import { appendAuditEvent } from "@/server/audit/audit-service";
import {
  changeManagedAccountEmail,
  changeManagedAccountRole,
  createOwnerManagedAccount,
  revokeManagedAccountSessions,
  sendManagedPasswordLink,
  setManagedAccountStatus,
} from "@/server/services/account-administration-service";
import { getAuthProviders } from "@/server/auth/providers";
import { headers } from "next/headers";
import { personaExperiences, type PersonaKey } from "@/features/access-control/persona-experiences";
export async function selectPersona(formData: FormData) {
  await getAuthorizationContext();
  if (!authRuntimeConfig().isMockMode) throw new Error("FORBIDDEN");
  const persona = String(formData.get("persona") ?? "") as PersonaKey;
  if (!["owner", "director", "teacher", "student", "parent"].includes(persona)) return;
  const profile = accessStore.profiles.find((candidate) => candidate.id === persona);
  if (!profile?.authUserId) throw new Error("UNAUTHORIZED");
  const session = await mockSessionProvider.create(profile.authUserId);
  (await cookies()).set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expiresAt),
  });
  revalidatePath("/", "layout");
  redirect(personaExperiences[persona].recommendedRoute);
}
export async function updateAccountAction(formData: FormData) {
  const actor = await getAuthorizationContext();
  const status = String(formData.get("status"));
  const membershipId = String(formData.get("membershipId"));
  const providers = getAuthProviders();
  await providers.audit.assertWritable();
  if (status === "active" || status === "inactive") {
    const outcome = await setManagedAccountStatus(actor, { membershipId, status }, providers);
    await appendAuditEvent(providers.audit, {
      actor,
      organizationId: actor.organizationId,
      action: status === "active" ? "account.restored" : "account.disabled",
      resourceType: "account",
      resourceId: membershipId,
      result: outcome.ok ? "succeeded" : "denied",
      metadata: outcome.ok ? { nextStatus: status } : { reasonCode: outcome.code },
    });
  }
  const roleId = String(formData.get("roleId") ?? "");
  if (roleId) {
    const outcome = await changeManagedAccountRole(actor, { membershipId, roleId }, providers);
    await appendAuditEvent(providers.audit, {
      actor,
      organizationId: actor.organizationId,
      action: "role.permissions_changed",
      resourceType: "account-role",
      resourceId: membershipId,
      result: outcome.ok ? "succeeded" : "denied",
      metadata: outcome.ok ? { roleId } : { reasonCode: outcome.code },
    });
  }
  revalidatePath("/settings/accounts");
}

export async function createAccountAction(formData: FormData) {
  const actor = await getAuthorizationContext();
  const providers = getAuthProviders();
  await providers.audit.assertWritable();
  const outcome = await createOwnerManagedAccount(
    actor,
    {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      initialPassword: String(formData.get("initialPassword") ?? ""),
      roleId: String(formData.get("roleId") ?? ""),
      status: formData.get("status") === "active" ? "active" : "inactive",
      classIds: formData.getAll("classId").map(String),
    },
    providers,
  );
  await appendAuditEvent(providers.audit, {
    actor,
    organizationId: actor.organizationId,
    action: "account.created",
    resourceType: "account",
    result: outcome.ok ? "succeeded" : "denied",
    metadata: outcome.ok
      ? { roleId: String(formData.get("roleId") ?? "") }
      : { reasonCode: outcome.code },
  });
  revalidatePath("/settings/accounts");
}

export async function manageAccountCredentialAction(formData: FormData) {
  const actor = await getAuthorizationContext();
  const providers = getAuthProviders();
  await providers.audit.assertWritable();
  const membershipId = String(formData.get("membershipId") ?? "");
  const operation = String(formData.get("operation") ?? "");
  if (operation === "email") {
    const outcome = await changeManagedAccountEmail(
      actor,
      { membershipId, email: String(formData.get("email") ?? "") },
      providers,
    );
    await appendAuditEvent(providers.audit, {
      actor,
      organizationId: actor.organizationId,
      action: "account.email_changed",
      resourceType: "account",
      resourceId: membershipId,
      result: outcome.ok ? "succeeded" : "denied",
      metadata: outcome.ok ? { changedFields: "email" } : { reasonCode: outcome.code },
    });
  }
  if (operation === "setup" || operation === "recovery") {
    const requestHeaders = await headers();
    const outcome = await sendManagedPasswordLink(
      actor,
      {
        membershipId,
        purpose: operation,
        callbackBaseUrl: requestHeaders.get("origin") ?? "http://localhost:3000",
      },
      providers,
    );
    await appendAuditEvent(providers.audit, {
      actor,
      organizationId: actor.organizationId,
      action: "password.reset_requested",
      resourceType: "account",
      resourceId: membershipId,
      result: outcome.ok ? "succeeded" : "denied",
      metadata: outcome.ok ? {} : { reasonCode: outcome.code },
    });
  }
  if (operation === "revoke") {
    const outcome = await revokeManagedAccountSessions(actor, membershipId, providers);
    await appendAuditEvent(providers.audit, {
      actor,
      organizationId: actor.organizationId,
      action: "account.sessions_revoked",
      resourceType: "account",
      resourceId: membershipId,
      result: outcome.ok ? "succeeded" : "denied",
      metadata: outcome.ok ? {} : { reasonCode: outcome.code },
    });
  }
  revalidatePath("/settings/accounts");
}
export async function updateRoleAction(formData: FormData) {
  const actor = await getAuthorizationContext();
  const providers = getAuthProviders();
  await providers.audit.assertWritable();
  const permissions = formData.getAll("permission").map(String) as PermissionCode[];
  const outcome = updateRolePermissions(actor, {
    roleId: String(formData.get("roleId")),
    version: Number(formData.get("version")),
    permissions,
  });
  await appendAuditEvent(providers.audit, {
    actor,
    organizationId: actor.organizationId,
    action: "role.permissions_changed",
    resourceType: "role",
    resourceId: String(formData.get("roleId")),
    result: outcome.ok ? "succeeded" : "denied",
    metadata: outcome.ok ? { changedFields: "permissions" } : { reasonCode: outcome.code },
  });
  revalidatePath("/settings/roles");
}
