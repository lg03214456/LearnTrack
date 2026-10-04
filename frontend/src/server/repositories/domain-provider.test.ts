import { describe, expect, it } from "vitest";
import { selectDomainRepository } from "./domain-provider";

describe("domain repository provider composition", () => {
  const providers = { mock: { source: "mock" }, supabase: { source: "supabase" } } as const;

  it("selects the explicitly configured adapter", () => {
    expect(selectDomainRepository(providers, "mock")).toBe(providers.mock);
    expect(selectDomainRepository(providers, "supabase")).toBe(providers.supabase);
  });
});
