export const auditActions = [
  "auth.login",
  "auth.logout",
  "password.reset_requested",
  "password.changed",
  "account.created",
  "account.email_changed",
  "account.sessions_revoked",
  "account.disabled",
  "account.restored",
  "role.permissions_changed",
  "student.changed",
  "class.changed",
  "attendance.changed",
  "curriculum.changed",
  "progress.changed",
  "assessment.changed",
  "lifecycle.changed",
  "export.created",
] as const;

export type AuditAction = (typeof auditActions)[number];

export const safeAuditMetadataKeys = [
  "changedFields",
  "previousStatus",
  "nextStatus",
  "roleId",
  "classCount",
  "recordCount",
  "reasonCode",
] as const;
