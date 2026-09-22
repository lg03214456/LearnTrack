import { describe, expect, it } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { can } from "./policy";
describe("curriculum permissions", () => {
  it("assigns capabilities by persona", () => {
    expect(can(resolveMockIdentity("owner"), "curriculum.manage")).toBe(true);
    expect(can(resolveMockIdentity("teacher"), "study_plans.manage")).toBe(true);
    expect(can(resolveMockIdentity("assistant"), "curriculum.read")).toBe(true);
    expect(can(resolveMockIdentity("limited"), "curriculum.manage")).toBe(false);
  });
});
