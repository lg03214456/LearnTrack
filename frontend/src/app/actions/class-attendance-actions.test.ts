import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { getAuthorizationContext } from "@/server/auth/identity";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { saveClassAttendance } from "@/server/services/class-attendance-service";
import { saveClassAttendanceAction } from "./class-attendance-actions";
const audit = vi.hoisted(() => ({ assertWritable: vi.fn(), append: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth/identity", () => ({ getAuthorizationContext: vi.fn() }));
vi.mock("@/server/auth/providers", () => ({ getAuthProviders: () => ({ audit }) }));
vi.mock("@/server/services/class-attendance-service", () => ({ saveClassAttendance: vi.fn() }));
const form = () => {
  const data = new FormData();
  data.set(
    "command",
    JSON.stringify({
      sessionId: "session",
      sessionRevision: 1,
      reason: "私人原因",
      entries: [
        { sessionMemberId: "member", studentId: "student", status: "late", arrivalTime: "18:42" },
      ],
    }),
  );
  return data;
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getAuthorizationContext).mockResolvedValue(resolveMockIdentity("owner"));
  vi.mocked(saveClassAttendance).mockResolvedValue({ ok: true, code: "OK", message: "已儲存" });
});
describe("audited attendance action", () => {
  it("uses authenticated actor and safe audit metadata; refreshes only after confirmed success", async () => {
    expect(await saveClassAttendanceAction(form())).toMatchObject({ ok: true });
    expect(saveClassAttendance).toHaveBeenCalledWith(
      resolveMockIdentity("owner"),
      expect.objectContaining({ sessionId: "session" }),
    );
    expect(audit.append.mock.calls[0][0]).toMatchObject({
      action: "attendance.changed",
      organizationId: resolveMockIdentity("owner").organizationId,
      result: "succeeded",
      metadata: { recordCount: 1 },
    });
    expect(JSON.stringify(audit.append.mock.calls[0][0])).not.toContain("私人原因");
    expect(JSON.stringify(audit.append.mock.calls[0][0])).not.toContain("18:42");
    expect(revalidatePath).toHaveBeenCalledWith("/attendance");
  });
  it("rejects malformed payload without mutation", async () => {
    const data = new FormData();
    data.set("command", "[null]");
    expect(await saveClassAttendanceAction(data)).toMatchObject({ ok: false });
    expect(saveClassAttendance).not.toHaveBeenCalled();
  });
  it("rejects anonymous identity before mutation", async () => {
    vi.mocked(getAuthorizationContext).mockRejectedValue(new Error("UNAUTHORIZED"));
    await expect(saveClassAttendanceAction(form())).rejects.toThrow("UNAUTHORIZED");
    expect(saveClassAttendance).not.toHaveBeenCalled();
  });
  it("fails closed before writes when audit is unavailable", async () => {
    audit.assertWritable.mockRejectedValue(new Error("AUDIT_UNAVAILABLE"));
    await expect(saveClassAttendanceAction(form())).rejects.toThrow("AUDIT_UNAVAILABLE");
    expect(saveClassAttendance).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("does not report success or refresh when audit append fails after write", async () => {
    audit.append.mockRejectedValue(new Error("AUDIT_UNAVAILABLE"));
    await expect(saveClassAttendanceAction(form())).rejects.toThrow("AUDIT_UNAVAILABLE");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("audits denial without refreshing", async () => {
    vi.mocked(saveClassAttendance).mockResolvedValue({
      ok: false,
      code: "FORBIDDEN",
      message: "拒絕",
    });
    expect(await saveClassAttendanceAction(form())).toMatchObject({ ok: false });
    expect(audit.append.mock.calls[0][0].result).toBe("denied");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
