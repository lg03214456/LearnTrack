import "server-only";

import type { AuditEventView } from "@/features/audit-log/audit-log.types";
import type { AuditEventInput, AuditRepository } from "@/server/auth/contracts";
import { getSupabasePublicConfig } from "@/lib/supabase/public-config";
import { createClient } from "@supabase/supabase-js";

function client() {
  const { url } = getSupabasePublicConfig();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!key) throw new Error("AUTH_CONFIGURATION_INVALID");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function view(row: Record<string, unknown>): AuditEventView {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    actorProfileId: row.actor_profile_id ? String(row.actor_profile_id) : undefined,
    actorName: String(row.actor_name),
    action: String(row.action),
    resourceType: String(row.resource_type),
    resourceId: row.resource_id ? String(row.resource_id) : undefined,
    result: row.result as AuditEventView["result"],
    createdAt: String(row.created_at),
    metadata: (row.metadata ?? {}) as AuditEventView["metadata"],
  };
}

export const postgresAuditRepository: AuditRepository = {
  async assertWritable() {
    const { error } = await client().from("audit_logs").select("id").limit(1);
    if (error) throw new Error("AUDIT_UNAVAILABLE");
  },
  async append(event: AuditEventInput) {
    const { data, error } = await client()
      .from("audit_logs")
      .insert({
        organization_id: event.organizationId,
        actor_profile_id: event.actorProfileId ?? null,
        actor_name: event.actorName,
        action: event.action,
        resource_type: event.resourceType,
        resource_id: event.resourceId ?? null,
        result: event.result,
        request_id: event.requestId ?? null,
        metadata: event.metadata,
      })
      .select()
      .single();
    if (error || !data) throw new Error("AUDIT_UNAVAILABLE");
    return view(data as Record<string, unknown>);
  },
  async list(input) {
    let query = client()
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("organization_id", input.organizationId)
      .order("created_at", { ascending: false });
    if (input.actorProfileId) query = query.eq("actor_profile_id", input.actorProfileId);
    if (input.action) query = query.eq("action", input.action);
    if (input.resourceType) query = query.eq("resource_type", input.resourceType);
    if (input.result) query = query.eq("result", input.result);
    if (input.from) query = query.gte("created_at", input.from);
    if (input.to) query = query.lte("created_at", input.to);
    const start = (input.page - 1) * input.pageSize;
    const { data, error, count } = await query.range(start, start + input.pageSize - 1);
    if (error) throw new Error("AUDIT_UNAVAILABLE");
    return {
      rows: (data ?? []).map((row) => view(row as Record<string, unknown>)),
      total: count ?? 0,
    };
  },
};
