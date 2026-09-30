import { describe, expect, it, vi } from "vitest";
import type {
  OrganizationAuthorizationContext,
  PlatformAuthorizationContext,
} from "@/features/access-control/access-control.types";
import type { AuditRepository } from "@/server/auth/contracts";
import { appendAuthenticationAuditEvent } from "./authentication-audit";

const organizationActor: OrganizationAuthorizationContext = {
  actorType: "organization",
  profileId: "profile-organization-owner",
  name: "Organization Owner",
  email: "owner@example.test",
  membershipId: "membership-owner",
  organizationId: "organization-a",
  roleId: "role-owner",
  roleName: "Owner",
  status: "active",
  scope: { kind: "organization-wide" },
  permissions: ["audit.read"],
};

const platformActor: PlatformAuthorizationContext = {
  actorType: "platform",
  profileId: "profile-platform-owner",
  name: "Platform Owner",
  email: "platform@example.test",
  platformRole: "platform-owner",
  status: "active",
  permissions: ["platform.audit.read"],
};

function repository(): AuditRepository {
  return {
    assertWritable: vi.fn().mockResolvedValue(undefined),
    append: vi.fn().mockImplementation(async (event) => ({
      ...event,
      id: "audit-event",
      createdAt: new Date(0).toISOString(),
    })),
    list: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
  };
}

describe("appendAuthenticationAuditEvent", () => {
  it("writes organization authentication events to the tenant audit store", async () => {
    const tenantAudit = repository();
    const appendPlatform = vi.fn();

    await appendAuthenticationAuditEvent({
      repository: tenantAudit,
      targetActor: organizationActor,
      attributeOrganizationActor: true,
      action: "auth.login",
      resourceType: "session",
      result: "succeeded",
      appendPlatform,
    });

    expect(tenantAudit.assertWritable).toHaveBeenCalledOnce();
    expect(tenantAudit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "organization-a",
        actorProfileId: "profile-organization-owner",
        action: "auth.login",
      }),
    );
    expect(appendPlatform).not.toHaveBeenCalled();
  });

  it("writes Platform Owner authentication events only to the platform audit store", async () => {
    const tenantAudit = repository();
    const appendPlatform = vi.fn().mockResolvedValue(undefined);

    await appendAuthenticationAuditEvent({
      repository: tenantAudit,
      targetActor: platformActor,
      action: "auth.login",
      resourceType: "session",
      result: "succeeded",
      appendPlatform,
    });

    expect(tenantAudit.assertWritable).not.toHaveBeenCalled();
    expect(tenantAudit.append).not.toHaveBeenCalled();
    expect(appendPlatform).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: platformActor,
        action: "platform.auth.login",
        resourceType: "session",
        resourceId: "profile-platform-owner",
      }),
    );
  });

  it("does not fabricate an organization for an unresolved identity", async () => {
    const tenantAudit = repository();
    const appendPlatform = vi.fn();

    await appendAuthenticationAuditEvent({
      repository: tenantAudit,
      targetActor: null,
      action: "auth.login",
      resourceType: "session",
      result: "denied",
      appendPlatform,
    });

    expect(tenantAudit.assertWritable).not.toHaveBeenCalled();
    expect(tenantAudit.append).not.toHaveBeenCalled();
    expect(appendPlatform).not.toHaveBeenCalled();
  });
});
