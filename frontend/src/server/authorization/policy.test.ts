import { describe, it, expect, beforeEach } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { can, canAccessClass } from "./policy";
import { accessStore } from "@/server/data/mock/access";
import { validatePermissionCatalog } from "./permission-catalog";
describe("authorization policy", () => {
  beforeEach(() => accessStore.reset());
  it("validates the stable catalog", () => expect(validatePermissionCatalog()).toBe(true));
  it("scopes teachers to assigned classes", () => {
    const actor = resolveMockIdentity("teacher");
    expect(can(actor, "students.read")).toBe(true);
    expect(can(actor, "accounts.read")).toBe(false);
    expect(canAccessClass(actor, "cls-1")).toBe(true);
    expect(canAccessClass(actor, "cls-2")).toBe(false);
  });
  it("gives owners organization-wide access", () =>
    expect(resolveMockIdentity("owner").scope.kind).toBe("organization-wide"));
  it("rejects inactive identities", () =>
    expect(() => resolveMockIdentity("inactive")).toThrow("UNAUTHORIZED"));
});
