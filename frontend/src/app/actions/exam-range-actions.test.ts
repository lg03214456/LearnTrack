import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { saveExamRange } from "@/server/services/exam-range-service";
import { saveExamRangeAction } from "./exam-range-actions";
import { resolveMockIdentity } from "@/server/auth/identity-core";
const audit = vi.hoisted(() => ({ assertWritable: vi.fn(), append: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/services/exam-range-service", () => ({ saveExamRange: vi.fn() }));
vi.mock("@/server/auth/identity", () => ({
  getAuthorizationContext: vi.fn(async () => resolveMockIdentity("owner")),
}));
vi.mock("@/server/auth/providers", () => ({ getAuthProviders: () => ({ audit }) }));
const command = {
  studentId: "stu-1",
  rangeId: null,
  revision: 0,
  name: "私有段考名稱",
  examDate: null,
  itemIds: ["a"],
};
beforeEach(() => {
  vi.resetAllMocks();
  audit.assertWritable.mockResolvedValue(undefined);
  audit.append.mockResolvedValue({});
});
describe("exam range actions", () => {
  it("delegates the server actor, audits safe identifiers and invalidates only after success", async () => {
    vi.mocked(saveExamRange).mockResolvedValue({ ok: true, message: "已儲存" });
    expect(await saveExamRangeAction(command)).toMatchObject({ ok: true });
    expect(saveExamRange).toHaveBeenCalledWith(
      expect.objectContaining({ actorType: "organization" }),
      command,
    );
    expect(revalidatePath).toHaveBeenCalledWith("/students/stu-1");
    const event = audit.append.mock.calls[0][0];
    expect(event.action).toBe("curriculum.changed");
    expect(JSON.stringify(event)).not.toContain(command.name);
    expect(event.metadata).not.toHaveProperty("itemIds");
  });
  it("does not write if audit preflight fails", async () => {
    audit.assertWritable.mockRejectedValue(new Error("AUDIT_UNAVAILABLE"));
    expect(await saveExamRangeAction(command)).toMatchObject({ ok: false });
    expect(saveExamRange).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("does not report success when append fails after a mutation", async () => {
    vi.mocked(saveExamRange).mockResolvedValue({ ok: true, message: "已儲存" });
    audit.append.mockRejectedValue(new Error("AUDIT_UNAVAILABLE"));
    expect(await saveExamRangeAction(command)).toMatchObject({ ok: false });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("does not refresh or misreport a denied save", async () => {
    vi.mocked(saveExamRange).mockResolvedValue({ ok: false, message: "無權操作" });
    expect(await saveExamRangeAction(command)).toMatchObject({ ok: false });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(audit.append.mock.calls[0][0].result).toBe("denied");
  });
});
