import "server-only";

import { authRuntimeConfig } from "./provider-config";
import { mockAuditRepository } from "@/server/audit/mock-audit-repository";
import { postgresAuditRepository } from "@/server/audit/postgres-audit-repository";
import {
  mockAuthProvider,
  mockEmailProvider,
  mockMembershipRepository,
  mockPasswordLinkProvider,
  mockSessionProvider,
} from "./mock-providers";
import {
  supabaseAuthProvider,
  supabaseEmailProvider,
  supabaseSessionProvider,
  supabaseMembershipRepository,
} from "./supabase-providers";

export function getAuthProviders() {
  const config = authRuntimeConfig();
  const usesSupabaseAuth = config.authProvider === "supabase";
  const usesSupabaseEmail = config.emailProvider === "smtp";
  return {
    config,
    auth: usesSupabaseAuth ? supabaseAuthProvider : mockAuthProvider,
    email: usesSupabaseEmail ? supabaseEmailProvider : mockEmailProvider,
    memberships: usesSupabaseAuth ? supabaseMembershipRepository : mockMembershipRepository,
    passwordLinks: mockPasswordLinkProvider,
    sessions: usesSupabaseAuth ? supabaseSessionProvider : mockSessionProvider,
    audit: config.auditProvider === "postgres" ? postgresAuditRepository : mockAuditRepository,
  };
}
