import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import { accessStore } from "@/server/data/mock/access";
import type { MembershipRepository, SessionProvider } from "./contracts";
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
  if (!sessionId) return null;
  const session = await providers.sessions.find(sessionId);
  if (!session) return null;
  return providers.memberships.resolveByAuthUserId(session.authUserId);
}
