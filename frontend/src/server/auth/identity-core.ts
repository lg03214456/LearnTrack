import type {
  AuthenticatedActor,
  AuthorizationContext,
  PlatformAuthorizationContext,
  PlatformPermissionCode,
} from "@/features/access-control/access-control.types";
import { platformPermissionCodes } from "@/features/access-control/access-control.types";
import { accessStore } from "@/server/data/mock/access";
import type { MembershipRepository, SessionProvider } from "./contracts";

export function buildPlatformActor(input: {
  profile: { id: string; displayName: string; email: string };
  operator: { roleCode: string; status: string } | null;
  permissionCodes: string[];
}): PlatformAuthorizationContext | null {
  if (
    !input.operator ||
    input.operator.status !== "active" ||
    input.operator.roleCode !== "platform-owner"
  )
    return null;
  const catalog = new Set(platformPermissionCodes);
  const permissions = [...new Set(input.permissionCodes)].filter(
    (code): code is PlatformPermissionCode => catalog.has(code as PlatformPermissionCode),
  );
  if (!permissions.length) return null;
  return {
    actorType: "platform",
    profileId: input.profile.id,
    name: input.profile.displayName,
    email: input.profile.email,
    platformRole: "platform-owner",
    status: "active",
    permissions,
  };
}
export function resolveMockIdentity(profileId: string): AuthorizationContext {
  const profile = accessStore.profiles.find((x) => x.id === profileId),
    membership = accessStore.memberships.find((x) => x.profileId === profileId);
  if (!profile || !membership) throw new Error("UNAUTHORIZED");
  const role = accessStore.roles.find((x) => x.id === membership.roleId);
  if (!role || membership.status !== "active") throw new Error("UNAUTHORIZED");
  const scope = membership.studentId
    ? { kind: "self-student" as const, studentId: membership.studentId }
    : membership.linkedStudentIds
      ? { kind: "linked-students" as const, studentIds: membership.linkedStudentIds }
      : membership.classIds.length
        ? { kind: "assigned-classes" as const, classIds: membership.classIds }
        : { kind: "organization-wide" as const };
  return {
    actorType: "organization",
    profileId,
    membershipId: membership.id,
    organizationId: membership.organizationId,
    name: profile.name,
    email: profile.email,
    roleId: role.id,
    roleName: role.name,
    status: membership.status,
    permissions: role.permissions,
    scope,
  };
}

export async function resolveSessionIdentity(
  sessionId: string | undefined,
  providers: { sessions: SessionProvider; memberships: MembershipRepository },
): Promise<AuthorizationContext | null> {
  const actor = await resolveAuthenticatedSessionIdentity(sessionId, providers);
  return actor?.actorType === "organization" ? actor : null;
}

export async function resolveAuthenticatedSessionIdentity(
  sessionId: string | undefined,
  providers: { sessions: SessionProvider; memberships: MembershipRepository },
): Promise<AuthenticatedActor | null> {
  if (!sessionId) return null;
  const session = await providers.sessions.find(sessionId);
  if (!session) return null;
  return providers.memberships.resolveByAuthUserId(session.authUserId);
}
