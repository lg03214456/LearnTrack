import { describe, expect, it, vi } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { appendAuditEvent, executeAuditedCommit, safeAuditMetadata } from "./audit-service";
import { mockAuditRepository } from "./mock-audit-repository";

describe("audit service", () => {
  it("keeps only allowlisted, non-sensitive metadata", () => {
    expect(
      safeAuditMetadata({
        changedFields: "status,roleId",
        password: "Never-log-this",
        token: "secret-token",
        resetLink: "https://example.test/reset?token=x",
        studentName: "個資",
        reasonCode: "VALIDATION_ERROR",
      }),
    ).toEqual({ changedFields: "status,roleId", reasonCode: "VALIDATION_ERROR" });
  });

  it("normalizes organization, actor, resource, correlation, and safe diff", async () => {
    mockAuditRepository.reset();
    const actor = resolveMockIdentity("owner");
    const event = await appendAuditEvent(mockAuditRepository, {
      actor,
      organizationId: actor.organizationId,
      action: "account.disabled",
      resourceType: "account",
      resourceId: "m-teacher",
      result: "succeeded",
      requestId: "request-1",
      metadata: { previousStatus: "active", nextStatus: "inactive", password: "blocked" },
    });
    expect(event).toMatchObject({
      actorProfileId: "owner",
      requestId: "request-1",
      result: "succeeded",
    });
    expect(event.metadata).toEqual({ previousStatus: "active", nextStatus: "inactive" });
  });

  it("does not commit when required audit persistence fails", async () => {
    const commit = vi.fn();
    await expect(
      executeAuditedCommit({
        repository: {
          assertWritable: vi.fn().mockRejectedValue(new Error("AUDIT_UNAVAILABLE")),
          append: vi.fn(),
          list: vi.fn(),
        },
        event: {
          organizationId: "org",
          action: "student.changed",
          resourceType: "student",
          result: "succeeded",
        },
        commit,
      }),
    ).rejects.toThrow("AUDIT_UNAVAILABLE");
    expect(commit).not.toHaveBeenCalled();
  });
});
