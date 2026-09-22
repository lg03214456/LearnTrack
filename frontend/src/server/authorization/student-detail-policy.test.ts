import { describe, expect, it } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { can } from "./policy";
describe("student detail permissions", () => {
  it("maps profile and assessment capabilities", () => {
    expect(can(resolveMockIdentity("owner"), "student_profiles.manage")).toBe(true);
    expect(can(resolveMockIdentity("admin"), "assessment_history.manage")).toBe(true);
    expect(can(resolveMockIdentity("teacher"), "assessment_history.manage")).toBe(true);
    expect(can(resolveMockIdentity("assistant"), "student_profiles.manage")).toBe(false);
    expect(can(resolveMockIdentity("assistant"), "assessment_history.manage")).toBe(true);
    expect(can(resolveMockIdentity("limited"), "assessment_history.read")).toBe(true);
    expect(() => resolveMockIdentity("inactive")).toThrow("UNAUTHORIZED");
  });
});
