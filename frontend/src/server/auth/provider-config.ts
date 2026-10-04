import "server-only";

import { parseSupabasePublicConfig } from "@/lib/supabase/public-config";

export type AuthProviderKind = "mock" | "supabase";
export type EmailProviderKind = "mock" | "smtp";
export type AuditProviderKind = "mock" | "postgres";
export type DomainDataProviderKind = "mock" | "supabase";

export interface AuthRuntimeConfig {
  authProvider: AuthProviderKind;
  emailProvider: EmailProviderKind;
  auditProvider: AuditProviderKind;
  domainDataProvider: DomainDataProviderKind;
  isMockMode: boolean;
}

type RuntimeEnvironment = Record<string, string | undefined>;

export function parsePasswordResetPath(value: string | undefined): string {
  const path = value?.trim() || "/password/reset";
  if (!/^\/(?!\/)/.test(path) || path.includes("://") || path.includes("#"))
    throw new Error("AUTH_CONFIGURATION_INVALID");
  return path;
}

const provider = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
  value && allowed.includes(value as T) ? (value as T) : null;

export function parseAuthRuntimeConfig(env: RuntimeEnvironment): AuthRuntimeConfig {
  const isProduction = env.NODE_ENV === "production";
  const authProvider =
    provider(env.LEARNTRACK_AUTH_PROVIDER, ["mock", "supabase"] as const) ??
    (isProduction ? null : "mock");
  const emailProvider =
    provider(env.LEARNTRACK_EMAIL_PROVIDER, ["mock", "smtp"] as const) ??
    (isProduction ? null : "mock");
  const auditProvider =
    provider(env.LEARNTRACK_AUDIT_PROVIDER, ["mock", "postgres"] as const) ??
    (isProduction ? null : "mock");
  const domainDataProvider =
    provider(env.LEARNTRACK_DOMAIN_DATA_PROVIDER, ["mock", "supabase"] as const) ??
    (isProduction ? null : "mock");

  if (!authProvider || !emailProvider || !auditProvider || !domainDataProvider)
    throw new Error("AUTH_CONFIGURATION_INVALID");
  if (
    isProduction &&
    ([authProvider, emailProvider, auditProvider].includes("mock") || domainDataProvider === "mock")
  )
    throw new Error("AUTH_CONFIGURATION_INVALID");
  if (authProvider === "supabase") {
    try {
      parseSupabasePublicConfig(env);
    } catch {
      throw new Error("AUTH_CONFIGURATION_INVALID");
    }
    if (!env.SUPABASE_SECRET_KEY?.trim()) throw new Error("AUTH_CONFIGURATION_INVALID");
  }
  if (emailProvider === "smtp") {
    const siteUrl = env.AUTH_SITE_URL?.trim();
    try {
      if (!siteUrl || !["http:", "https:"].includes(new URL(siteUrl).protocol))
        throw new Error("AUTH_CONFIGURATION_INVALID");
    } catch {
      throw new Error("AUTH_CONFIGURATION_INVALID");
    }
  }
  parsePasswordResetPath(env.AUTH_PASSWORD_RESET_PATH);

  return {
    authProvider,
    emailProvider,
    auditProvider,
    domainDataProvider,
    isMockMode:
      authProvider === "mock" &&
      emailProvider === "mock" &&
      auditProvider === "mock" &&
      domainDataProvider === "mock",
  };
}

export const authRuntimeConfig = () => parseAuthRuntimeConfig(process.env);
