export const permissionCodes = [
  "students.read",
  "students.manage",
  "student_profiles.read",
  "student_profiles.manage",
  "assessment_history.read",
  "assessment_history.manage",
  "classes.read",
  "classes.manage",
  "attendance.read",
  "attendance.manage",
  "progress.read",
  "progress.manage",
  "analytics.read",
  "curriculum.read",
  "curriculum.manage",
  "study_plans.read",
  "study_plans.manage",
  "accounts.read",
  "accounts.manage",
  "roles.read",
  "roles.manage",
  "credentials.change_self",
  "credentials.force_reset",
  "audit.read",
] as const;
export type PermissionCode = (typeof permissionCodes)[number];
export type AccountStatus = "active" | "inactive";
export type DataScope =
  | { kind: "organization-wide" }
  | { kind: "assigned-classes"; classIds: string[] }
  | { kind: "self-student"; studentId: string }
  | { kind: "linked-students"; studentIds: string[] };
export interface PersonaExperience {
  profileId: string;
  label: string;
  roleName: string;
  scopeSummary: string;
  recommendedRoute: string;
  recommendedLabel: string;
  primaryOperations: string[];
}
export interface AuthorizationContext {
  profileId: string;
  membershipId: string;
  organizationId: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  status: AccountStatus;
  permissions: PermissionCode[];
  scope: DataScope;
}
export interface RoleView {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  version: number;
  memberCount: number;
  permissions: PermissionCode[];
}
export interface PermissionDefinition {
  code: PermissionCode;
  module: string;
  label: string;
  dependsOn?: PermissionCode;
}
export interface AccountRow {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  status: AccountStatus;
  classNames: string[];
  scopeLabel: string;
}
export interface AccountDirectory {
  rows: AccountRow[];
  roles: Pick<RoleView, "id" | "name">[];
  summary: { total: number; active: number; inactive: number };
  pagination: { page: number; total: number };
}
export interface AccountQuery {
  search?: string;
  roleId?: string;
  status?: AccountStatus;
  page: number;
  pageSize: number;
}
export interface CommandResult {
  ok: boolean;
  code: "OK" | "VALIDATION_ERROR" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";
  message: string;
}
