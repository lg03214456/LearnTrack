import { describe, expect, it, vi } from "vitest";
import type { PlatformAuthorizationContext } from "@/features/access-control/access-control.types";
import type { PlatformInspectionRepository } from "@/server/repositories/platform-inspection";
import {
  inspectPlatformOrganization,
  type PlatformInspectionAudit,
} from "./platform-inspection-service";

const actor: PlatformAuthorizationContext = {
  actorType: "platform",
  profileId: "platform-owner",
  name: "平台管理者",
  email: "platform@example.test",
  platformRole: "platform-owner",
  status: "active",
  permissions: ["platform.organizations.read", "platform.tenant_data.read"],
};

function fixture(organizationId: string) {
  return {
    organization: { id: organizationId, name: `機構 ${organizationId}`, status: "active" as const },
    students: [
      {
        id: `student-${organizationId}`,
        studentNumber: "001",
        displayName: `學生 ${organizationId}`,
        status: "active",
      },
    ],
    classes: [{ id: `class-${organizationId}`, name: `班級 ${organizationId}`, status: "active" }],
  };
}

describe("platform inspection service", () => {
  it("switches organization snapshots without retaining prior tenant data and audits each read", async () => {
    const repository: PlatformInspectionRepository = {
      readOrganization: vi.fn(async (_actor, organizationId) => fixture(organizationId)),
    };
    const append = vi.fn(async () => undefined);
    const audit: PlatformInspectionAudit = { append };

    const first = await inspectPlatformOrganization({
      actor,
      targetOrganizationId: "a",
      accessToken: "token",
      requestId: "request-a",
      repository,
      audit,
    });
    const second = await inspectPlatformOrganization({
      actor,
      targetOrganizationId: "b",
      accessToken: "token",
      requestId: "request-b",
      repository,
      audit,
    });

    expect(first.students.map((student) => student.id)).toEqual(["student-a"]);
    expect(second.students.map((student) => student.id)).toEqual(["student-b"]);
    expect(second.students).not.toContainEqual(first.students[0]);
    expect(append).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        targetOrganizationId: "a",
        action: "platform.organization.inspect",
        requestId: "request-a",
      }),
    );
    expect(append).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        targetOrganizationId: "b",
        action: "platform.organization.inspect",
        requestId: "request-b",
      }),
    );
  });

  it("fails closed and audits when an organization target is missing", async () => {
    const repository: PlatformInspectionRepository = { readOrganization: vi.fn() };
    const append = vi.fn(async () => undefined);
    await expect(
      inspectPlatformOrganization({
        actor,
        targetOrganizationId: " ",
        accessToken: "token",
        repository,
        audit: { append },
      }),
    ).rejects.toThrow("ORGANIZATION_TARGET_REQUIRED");
    expect(repository.readOrganization).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "platform.organization.inspect_denied", result: "denied" }),
    );
  });

  it("does not retain an invalid target and records a denied inspection", async () => {
    const repository: PlatformInspectionRepository = {
      readOrganization: vi.fn(async () => {
        throw new Error("ORGANIZATION_NOT_FOUND");
      }),
    };
    const append = vi.fn(async () => undefined);
    await expect(
      inspectPlatformOrganization({
        actor,
        targetOrganizationId: "forged",
        accessToken: "token",
        repository,
        audit: { append },
      }),
    ).rejects.toThrow("ORGANIZATION_NOT_FOUND");
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "platform.organization.inspect_denied", result: "denied" }),
    );
  });
});
