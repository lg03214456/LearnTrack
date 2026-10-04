import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn(() => ({ source: "supabase" }));

vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/lib/supabase/public-config", () => ({
  getSupabasePublicConfig: () => ({
    url: "https://example.supabase.co",
    publishableKey: "sb_publishable_test",
  }),
}));

describe("user-session Supabase client", () => {
  beforeEach(() => createClient.mockClear());

  it("uses the publishable key and forwards only the actor bearer token", async () => {
    const { createUserSessionSupabaseClient } = await import("./user-session-client");
    createUserSessionSupabaseClient(" actor-token ");

    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_publishable_test",
      expect.objectContaining({
        global: { headers: { Authorization: "Bearer actor-token" } },
      }),
    );
  });

  it("rejects an empty actor token", async () => {
    const { createUserSessionSupabaseClient } = await import("./user-session-client");
    expect(() => createUserSessionSupabaseClient("  ")).toThrow("SUPABASE_SESSION_REQUIRED");
    expect(createClient).not.toHaveBeenCalled();
  });
});
