import "server-only";

import type { PlatformAuthorizationContext } from "@/features/access-control/access-control.types";
import type { PlatformOrganizationSnapshot } from "@/features/platform-inspection/platform-inspection.types";
import type { PlatformInspectionRepository } from "@/server/repositories/platform-inspection";

export interface PlatformInspectionAudit {
  append(input: {
    actor: PlatformAuthorizationContext;
    targetOrganizationId?: string;
    action: "platform.organization.inspect" | "platform.organization.inspect_denied";
    result: "succeeded" | "denied";
    requestId?: string;
  }): Promise<void>;
}

export async function inspectPlatformOrganization(input: {
  actor: PlatformAuthorizationContext;
  targetOrganizationId: string;
  accessToken: string;
  requestId?: string;
  repository: PlatformInspectionRepository;
  audit: PlatformInspectionAudit;
}): Promise<PlatformOrganizationSnapshot> {
  const targetOrganizationId = input.targetOrganizationId.trim();
  if (!targetOrganizationId) {
    await input.audit.append({
      actor: input.actor,
      action: "platform.organization.inspect_denied",
      result: "denied",
      requestId: input.requestId,
    });
    throw new Error("ORGANIZATION_TARGET_REQUIRED");
  }

  try {
    const snapshot = await input.repository.readOrganization(
      input.actor,
      targetOrganizationId,
      input.accessToken,
    );
    await input.audit.append({
      actor: input.actor,
      targetOrganizationId: snapshot.organization.id,
      action: "platform.organization.inspect",
      result: "succeeded",
      requestId: input.requestId,
    });
    return snapshot;
  } catch (error) {
    await input.audit.append({
      actor: input.actor,
      action: "platform.organization.inspect_denied",
      result: "denied",
      requestId: input.requestId,
    });
    throw error;
  }
}
