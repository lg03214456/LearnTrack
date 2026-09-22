export const auditResults = ["succeeded", "denied", "failed"] as const;
export type AuditResult = (typeof auditResults)[number];

export interface AuditEventView {
  id: string;
  organizationId: string;
  actorProfileId?: string;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  result: AuditResult;
  createdAt: string;
  metadata: Record<string, string | number | boolean | null>;
}
