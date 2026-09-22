import { beforeEach, describe, expect, it } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { can } from "@/server/authorization/policy";
import { appendAuditEvent } from "./audit-service";
import { mockAuditRepository } from "./mock-audit-repository";

describe("audit access and ordering", () => {
  beforeEach(() => mockAuditRepository.reset());

  it("allows organization-wide Owner and fails closed for teacher", () => {
    const owner = resolveMockIdentity("owner");
    const teacher = resolveMockIdentity("teacher");
    expect(can(owner, "audit.read") && owner.scope.kind === "organization-wide").toBe(true);
    expect(can(teacher, "audit.read") && teacher.scope.kind === "organization-wide").toBe(false);
  });

  it("returns only the requested organization in reverse chronological pages", async () => {
    await appendAuditEvent(mockAuditRepository, {
      organizationId: "other-org",
      action: "auth.login",
      resourceType: "session",
      result: "succeeded",
    });
    await appendAuditEvent(mockAuditRepository, {
      organizationId: "org-1",
      action: "auth.login",
      resourceType: "session",
      resourceId: "first",
      result: "succeeded",
    });
    await new Promise((resolve) => setTimeout(resolve, 2));
    await appendAuditEvent(mockAuditRepository, {
      organizationId: "org-1",
      action: "auth.logout",
      resourceType: "session",
      resourceId: "second",
      result: "succeeded",
    });
    const page = await mockAuditRepository.list({ organizationId: "org-1", page: 1, pageSize: 1 });
    expect(page.total).toBe(2);
    expect(page.rows[0].resourceId).toBe("second");
  });
});
