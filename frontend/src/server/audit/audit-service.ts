import "server-only";

import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type { AuditResult } from "@/features/audit-log/audit-log.types";
import type { AuditRepository } from "@/server/auth/contracts";
import { safeAuditMetadataKeys, type AuditAction } from "./audit-catalog";

const prohibited = /(password|hash|token|secret|credential|reset.?link|email|phone|name)/i;

export function safeAuditMetadata(metadata: Record<string, unknown>) {
  const allowed = new Set<string>(safeAuditMetadataKeys);
  return Object.fromEntries(
    Object.entries(metadata).filter(
      ([key, value]) =>
        allowed.has(key) &&
        !prohibited.test(key) &&
        !prohibited.test(String(value)) &&
        ["string", "number", "boolean"].includes(typeof value),
    ),
  ) as Record<string, string | number | boolean>;
}

export async function appendAuditEvent(
  repository: AuditRepository,
  input: {
    actor?: AuthorizationContext;
    organizationId: string;
    action: AuditAction;
    resourceType: string;
    resourceId?: string;
    result: AuditResult;
    requestId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  return repository.append({
    organizationId: input.organizationId,
    actorProfileId: input.actor?.profileId,
    actorName: input.actor?.name ?? "未驗證使用者",
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    result: input.result,
    requestId: input.requestId,
    metadata: safeAuditMetadata(input.metadata ?? {}),
  });
}

export async function executeAuditedCommit<T>(input: {
  repository: AuditRepository;
  event: Parameters<typeof appendAuditEvent>[1];
  commit: () => T | Promise<T>;
}): Promise<T> {
  await input.repository.assertWritable();
  const value = await input.commit();
  await appendAuditEvent(input.repository, input.event);
  return value;
}

export async function executeAuditedMutation<T extends { ok: boolean; code?: string }>(input: {
  repository: AuditRepository;
  event: Omit<Parameters<typeof appendAuditEvent>[1], "result" | "metadata"> & {
    metadata?: Record<string, unknown>;
  };
  mutate: () => T | Promise<T>;
}): Promise<T> {
  await input.repository.assertWritable();
  const outcome = await input.mutate();
  await appendAuditEvent(input.repository, {
    ...input.event,
    result: outcome.ok ? "succeeded" : "denied",
    metadata: outcome.ok
      ? input.event.metadata
      : { ...input.event.metadata, reasonCode: outcome.code ?? "OPERATION_FAILED" },
  });
  return outcome;
}
