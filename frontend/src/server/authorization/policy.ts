import type {
  AuthenticatedActor,
  OrganizationAuthorizationContext,
  PermissionCode,
  PlatformPermissionCode,
} from "@/features/access-control/access-control.types";
export const isOrganizationActor = (
  context: AuthenticatedActor,
): context is OrganizationAuthorizationContext => context.actorType === "organization";
export const can = (context: AuthenticatedActor, permission: PermissionCode) =>
  isOrganizationActor(context) &&
  context.status === "active" &&
  context.permissions.includes(permission);
export const canPlatform = (context: AuthenticatedActor, permission: PlatformPermissionCode) =>
  context.actorType === "platform" &&
  context.status === "active" &&
  context.permissions.includes(permission);
export const canReadOrganizationData = (
  context: AuthenticatedActor,
  targetOrganizationId: string,
) =>
  Boolean(targetOrganizationId) &&
  (canPlatform(context, "platform.tenant_data.read") ||
    (isOrganizationActor(context) && context.organizationId === targetOrganizationId));
export const canAccessClass = (context: AuthenticatedActor, classId: string) =>
  isOrganizationActor(context) &&
  (context.scope.kind === "organization-wide" ||
    (context.scope.kind === "assigned-classes" && context.scope.classIds.includes(classId)));
export const canAccessStudent = (context: AuthenticatedActor, studentId: string) =>
  isOrganizationActor(context) &&
  (context.scope.kind === "organization-wide" ||
    (context.scope.kind === "self-student" && context.scope.studentId === studentId) ||
    (context.scope.kind === "linked-students" && context.scope.studentIds.includes(studentId)));
export const canManageOwner = (context: AuthenticatedActor) =>
  isOrganizationActor(context) &&
  (context.roleId === "owner-role" || context.roleName.split("、").includes("Owner"));
export function requirePermission(context: AuthenticatedActor, permission: PermissionCode) {
  if (!can(context, permission)) throw new Error("FORBIDDEN");
}
