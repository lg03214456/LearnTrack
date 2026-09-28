import { describe, it, expect, beforeEach } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { can, canAccessClass, canPlatform, canReadOrganizationData } from "./policy";
import type { PlatformAuthorizationContext } from "@/features/access-control/access-control.types";
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
  it("keeps platform permissions separate and read-only across organizations", () => {
    const platform: PlatformAuthorizationContext = {
      actorType: "platform",
      profileId: "platform-owner",
      name: "Platform Owner",
      email: "platform@example.test",
      platformRole: "platform-owner",
      status: "active",
      permissions: ["platform.organizations.read", "platform.tenant_data.read"],
    };
    expect(canPlatform(platform, "platform.organizations.read")).toBe(true);
    expect(canReadOrganizationData(platform, "org-a")).toBe(true);
    expect(canReadOrganizationData(platform, "org-b")).toBe(true);
    expect(can(platform, "students.manage")).toBe(false);
    expect(canReadOrganizationData(resolveMockIdentity("owner"), "another-org")).toBe(false);
    expect(canReadOrganizationData(platform, "")).toBe(false);
  });
  it("rejects inactive identities", () =>
    expect(() => resolveMockIdentity("inactive")).toThrow("UNAUTHORIZED"));
});
