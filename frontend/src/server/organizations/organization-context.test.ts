import { describe, expect, it } from "vitest";
import type {
  AuthorizationContext,
  PlatformAuthorizationContext,
} from "@/features/access-control/access-control.types";
import { authoritativeOrganizationId } from "./organization-context";

const tenant: AuthorizationContext = {
  actorType: "organization",
  profileId: "tenant-owner",
  membershipId: "membership-a",
  organizationId: "organization-a",
  name: "A Owner",
  email: "a@example.test",
  roleId: "owner-a",
  roleName: "Owner",
  status: "active",
  permissions: ["students.read"],
  scope: { kind: "organization-wide" },
};

const platform: PlatformAuthorizationContext = {
  actorType: "platform",
  profileId: "platform-owner",
  name: "Platform Owner",
  email: "platform@example.test",
  platformRole: "platform-owner",
  status: "active",
  permissions: ["platform.organizations.read", "platform.tenant_data.read"],
};

describe("authoritative organization context", () => {
  it("ignores a forged organization target for tenant users", () => {
    expect(authoritativeOrganizationId(tenant, "organization-b")).toBe("organization-a");
  });

  it("requires an explicit non-empty target for platform users", () => {
    expect(authoritativeOrganizationId(platform)).toBeNull();
    expect(authoritativeOrganizationId(platform, "   ")).toBeNull();
    expect(authoritativeOrganizationId(platform, " organization-b ")).toBe("organization-b");
  });
});
