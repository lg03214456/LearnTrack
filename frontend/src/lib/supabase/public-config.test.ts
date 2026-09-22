import { describe, expect, it } from "vitest";
import { parseSupabasePublicConfig } from "./public-config";

describe("Supabase public configuration", () => {
  it("accepts the project URL and publishable key", () =>
    expect(
      parseSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    }));

  it("rejects an incomplete configuration", () =>
    expect(() =>
      parseSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrow("SUPABASE_PUBLIC_CONFIGURATION_INVALID"));

  it("rejects a non-HTTPS project URL", () =>
    expect(() =>
      parseSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      }),
    ).toThrow("SUPABASE_PUBLIC_CONFIGURATION_INVALID"));
});
