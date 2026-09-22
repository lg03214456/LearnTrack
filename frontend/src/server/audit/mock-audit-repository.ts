import "server-only";

import type { AuditEventView } from "@/features/audit-log/audit-log.types";
import type { AuditEventInput, AuditRepository } from "@/server/auth/contracts";

const rows: AuditEventView[] = [];

export const mockAuditRepository: AuditRepository & { reset(): void } = {
  async assertWritable() {},
  async append(event: AuditEventInput) {
    const row: AuditEventView = {
      ...event,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    rows.push(row);
    return structuredClone(row);
  },
  async list(input) {
    const filtered = rows
      .filter(
        (row) =>
          row.organizationId === input.organizationId &&
          (!input.actorProfileId || row.actorProfileId === input.actorProfileId) &&
          (!input.action || row.action === input.action) &&
          (!input.resourceType || row.resourceType === input.resourceType) &&
          (!input.result || row.result === input.result) &&
          (!input.from || row.createdAt >= input.from) &&
          (!input.to || row.createdAt <= input.to),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      rows: filtered
        .slice((input.page - 1) * input.pageSize, input.page * input.pageSize)
        .map((row) => structuredClone(row)),
      total: filtered.length,
    };
  },
  reset() {
    rows.length = 0;
  },
};
