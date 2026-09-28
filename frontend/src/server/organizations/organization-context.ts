import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { AuthenticatedActor } from "@/features/access-control/access-control.types";
import { getSupabasePublicConfig } from "@/lib/supabase/public-config";
import { canPlatform } from "@/server/authorization/policy";
import { authRuntimeConfig } from "@/server/auth/provider-config";
import { organizations as mockOrganizations } from "@/server/data/mock/relations";

export interface OrganizationSummary {
  id: string;
  name: string;
  status: "active" | "suspended" | "archived";
}

export function authoritativeOrganizationId(
  actor: AuthenticatedActor,
  requestedOrganizationId?: string,
) {
  if (actor.actorType === "organization") return actor.organizationId;
  const requested = requestedOrganizationId?.trim();
  return requested || null;
}

function organizationClient() {
  const { url } = getSupabasePublicConfig();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!key) throw new Error("AUTH_CONFIGURATION_INVALID");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function listActiveOrganizations(
  actor: AuthenticatedActor,
): Promise<OrganizationSummary[]> {
  if (!canPlatform(actor, "platform.organizations.read")) throw new Error("FORBIDDEN");
  const { data, error } = await organizationClient()
    .from("organizations")
    .select("id, name, status")
    .eq("status", "active")
    .order("name");
  if (error) throw new Error("ORGANIZATION_LOOKUP_FAILED");
  return (data ?? []) as OrganizationSummary[];
}

export async function resolveOrganizationSummary(
  actor: AuthenticatedActor,
  targetOrganizationId?: string,
): Promise<OrganizationSummary | null> {
  const organizationId = authoritativeOrganizationId(actor, targetOrganizationId);
  if (!organizationId) return null;
  if (actor.actorType === "platform" && !canPlatform(actor, "platform.organizations.read"))
    throw new Error("FORBIDDEN");

  if (authRuntimeConfig().isMockMode) {
    const match = mockOrganizations.find((organization) => organization.id === organizationId);
    return match ? { ...match, status: "active" } : null;
  }
  const { data, error } = await organizationClient()
    .from("organizations")
    .select("id, name, status")
    .eq("id", organizationId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error("ORGANIZATION_LOOKUP_FAILED");
  return (data as OrganizationSummary | null) ?? null;
}
