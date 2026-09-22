import { describe, expect, it } from "vitest";
import { parseAuthRuntimeConfig, parsePasswordResetPath } from "./provider-config";

describe("authentication provider configuration", () => {
  it("uses explicit Mock providers in development", () =>
    expect(parseAuthRuntimeConfig({ NODE_ENV: "development" })).toEqual({
      authProvider: "mock",
      emailProvider: "mock",
      auditProvider: "mock",
      isMockMode: true,
    }));

  it("rejects Mock providers in production", () =>
    expect(() =>
      parseAuthRuntimeConfig({
        NODE_ENV: "production",
        LEARNTRACK_AUTH_PROVIDER: "mock",
        LEARNTRACK_EMAIL_PROVIDER: "mock",
        LEARNTRACK_AUDIT_PROVIDER: "mock",
      }),
    ).toThrow("AUTH_CONFIGURATION_INVALID"));

  it("rejects incomplete production provider secrets", () =>
    expect(() =>
      parseAuthRuntimeConfig({
        NODE_ENV: "production",
        LEARNTRACK_AUTH_PROVIDER: "supabase",
        LEARNTRACK_EMAIL_PROVIDER: "smtp",
        LEARNTRACK_AUDIT_PROVIDER: "postgres",
      }),
    ).toThrow("AUTH_CONFIGURATION_INVALID"));

  it("accepts a complete production provider configuration", () =>
    expect(
      parseAuthRuntimeConfig({
        NODE_ENV: "production",
        LEARNTRACK_AUTH_PROVIDER: "supabase",
        LEARNTRACK_EMAIL_PROVIDER: "smtp",
        LEARNTRACK_AUDIT_PROVIDER: "postgres",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
        SUPABASE_SECRET_KEY: "sb_secret_test",
        AUTH_SITE_URL: "https://learntrack.example.test",
      }).isMockMode,
    ).toBe(false));

  it("does not accept the legacy anon key name", () =>
    expect(() =>
      parseAuthRuntimeConfig({
        NODE_ENV: "production",
        LEARNTRACK_AUTH_PROVIDER: "supabase",
        LEARNTRACK_EMAIL_PROVIDER: "smtp",
        LEARNTRACK_AUDIT_PROVIDER: "postgres",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-public-test-key",
        SUPABASE_SECRET_KEY: "sb_secret_test",
        AUTH_SITE_URL: "https://learntrack.example.test",
      }),
    ).toThrow("AUTH_CONFIGURATION_INVALID"));

  it("rejects Supabase-managed email without a valid site URL", () =>
    expect(() =>
      parseAuthRuntimeConfig({
        NODE_ENV: "production",
        LEARNTRACK_AUTH_PROVIDER: "supabase",
        LEARNTRACK_EMAIL_PROVIDER: "smtp",
        LEARNTRACK_AUDIT_PROVIDER: "postgres",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
        SUPABASE_SECRET_KEY: "sb_secret_test",
      }),
    ).toThrow("AUTH_CONFIGURATION_INVALID"));

  it("uses a safe default reset path and rejects external redirect paths", () => {
    expect(parsePasswordResetPath(undefined)).toBe("/password/reset");
    expect(parsePasswordResetPath("/auth/reset-password")).toBe("/auth/reset-password");
    expect(() => parsePasswordResetPath("https://attacker.example")).toThrow(
      "AUTH_CONFIGURATION_INVALID",
    );
  });
});
