import type {
  AuthorizationContext,
  PermissionCode,
} from "@/features/access-control/access-control.types";
export const can = (context: AuthorizationContext, permission: PermissionCode) =>
  context.status === "active" && context.permissions.includes(permission);
export const canAccessClass = (context: AuthorizationContext, classId: string) =>
  context.scope.kind === "organization-wide" ||
  (context.scope.kind === "assigned-classes" && context.scope.classIds.includes(classId));
export const canAccessStudent = (context: AuthorizationContext, studentId: string) =>
  context.scope.kind === "organization-wide" ||
  (context.scope.kind === "self-student" && context.scope.studentId === studentId) ||
  (context.scope.kind === "linked-students" && context.scope.studentIds.includes(studentId));
export const canManageOwner = (context: AuthorizationContext) =>
  context.roleId === "owner-role" || context.roleName.split("、").includes("Owner");
export function requirePermission(context: AuthorizationContext, permission: PermissionCode) {
  if (!can(context, permission)) throw new Error("FORBIDDEN");
}
