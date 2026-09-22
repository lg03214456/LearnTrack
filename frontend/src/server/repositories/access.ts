import "server-only";
import type {
  AccountDirectory,
  AccountQuery,
  AuthorizationContext,
  RoleView,
} from "@/features/access-control/access-control.types";
import { classRows } from "@/server/data/mock/fixtures";
import { accessStore } from "@/server/data/mock/access";
export function listAccounts(actor: AuthorizationContext, query: AccountQuery): AccountDirectory {
  const all = accessStore.memberships
    .filter((membership) => membership.organizationId === actor.organizationId)
    .map((membership) => {
      const profile = accessStore.profiles.find(
        (candidate) => candidate.id === membership.profileId,
      )!;
      const role = accessStore.roles.find((candidate) => candidate.id === membership.roleId)!;
      const classNames = membership.classIds
        .map((id) => classRows.find((candidate) => candidate.id === id)?.name)
        .filter(Boolean) as string[];
      const scopeLabel = membership.studentId
        ? "僅本人"
        : membership.linkedStudentIds
          ? `已綁定 ${membership.linkedStudentIds.length} 位孩子`
          : classNames.length
            ? classNames.join("、")
            : "全機構";
      return {
        id: membership.id,
        name: profile.name,
        email: profile.email,
        roleId: role.id,
        roleName: role.name,
        status: membership.status,
        classNames,
        scopeLabel,
      };
    });
  const term = query.search?.trim().toLowerCase() ?? "";
  const filtered = all.filter(
    (row) =>
      (!term || `${row.name} ${row.email}`.toLowerCase().includes(term)) &&
      (!query.roleId || row.roleId === query.roleId) &&
      (!query.status || row.status === query.status),
  );
  return {
    rows: filtered.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
    roles: accessStore.roles
      .filter((role) => role.organizationId === actor.organizationId)
      .map(({ id, name }) => ({ id, name })),
    summary: {
      total: all.length,
      active: all.filter((row) => row.status === "active").length,
      inactive: all.filter((row) => row.status === "inactive").length,
    },
    pagination: { page: query.page, total: filtered.length },
  };
}
export function listRoles(actor: AuthorizationContext): RoleView[] {
  return accessStore.roles
    .filter((role) => role.organizationId === actor.organizationId)
    .map((role) => ({
      ...role,
      memberCount: accessStore.memberships.filter(
        (membership) =>
          membership.organizationId === actor.organizationId && membership.roleId === role.id,
      ).length,
    }));
}
