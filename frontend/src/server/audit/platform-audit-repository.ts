import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { PlatformAuthorizationContext } from "@/features/access-control/access-control.types";
import { getSupabasePublicConfig } from "@/lib/supabase/public-config";

export type PlatformAuditAction =
  "platform.organization.inspect" | "platform.organization.inspect_denied";

function client() {
  const { url } = getSupabasePublicConfig();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!key) throw new Error("AUTH_CONFIGURATION_INVALID");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function appendPlatformAuditEvent(input: {
  actor: PlatformAuthorizationContext;
  targetOrganizationId?: string;
  action: PlatformAuditAction;
  result: "succeeded" | "denied" | "failed";
  requestId?: string;
}) {
  const { error } = await client()
    .from("platform_audit_logs")
    .insert({
      operator_profile_id: input.actor.profileId,
      target_organization_id: input.targetOrganizationId || null,
      action: input.action,
      resource_type: "organization",
      resource_id: input.targetOrganizationId || null,
      result: input.result,
      request_id: input.requestId || null,
      metadata: {},
    });
  if (error) throw new Error("PLATFORM_AUDIT_WRITE_FAILED");
}
