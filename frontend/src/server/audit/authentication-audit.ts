import "server-only";

import type { AuthenticatedActor } from "@/features/access-control/access-control.types";
import type { AuditEventView } from "@/features/audit-log/audit-log.types";
import type { AuditRepository } from "@/server/auth/contracts";
import { appendAuditEvent } from "./audit-service";
import { appendPlatformAuditEvent, type PlatformAuditAction } from "./platform-audit-repository";

type AuthenticationAuditAction = "auth.login" | "password.reset_requested" | "password.changed";

const platformAction = (action: AuthenticationAuditAction): PlatformAuditAction => {
  switch (action) {
    case "auth.login":
      return "platform.auth.login";
    case "password.reset_requested":
      return "platform.password.reset_requested";
    case "password.changed":
      return "platform.password.changed";
  }
};

export async function appendAuthenticationAuditEvent(input: {
  repository: AuditRepository;
  targetActor: AuthenticatedActor | null;
  attributeOrganizationActor?: boolean;
  action: AuthenticationAuditAction;
  resourceType: string;
  result: AuditEventView["result"];
  metadata?: Record<string, unknown>;
  appendPlatform?: typeof appendPlatformAuditEvent;
}) {
  if (!input.targetActor) return;

  if (input.targetActor.actorType === "platform") {
    await (input.appendPlatform ?? appendPlatformAuditEvent)({
      actor: input.targetActor,
      action: platformAction(input.action),
      result: input.result,
      resourceType: input.resourceType,
      resourceId: input.targetActor.profileId,
      metadata: input.metadata,
    });
    return;
  }

  await input.repository.assertWritable();
  await appendAuditEvent(input.repository, {
    actor: input.attributeOrganizationActor ? input.targetActor : undefined,
    organizationId: input.targetActor.organizationId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.targetActor.profileId,
    result: input.result,
    metadata: input.metadata,
  });
}
