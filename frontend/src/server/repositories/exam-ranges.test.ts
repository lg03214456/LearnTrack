import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { curriculumStore } from "@/server/data/mock/curriculum";
import { MockExamRangeRepository } from "./exam-ranges-mock";
import { SupabaseExamRangeRepository } from "./exam-ranges-supabase";
import type { SaveExamRangeCommand } from "@/features/curriculum/exam-range.types";

const owner = resolveMockIdentity("owner");
const baseCommand: SaveExamRangeCommand = {
  studentId: "stu-1",
  rangeId: null,
  revision: 0,
  name: "第一次段考",
  examDate: null,
  itemIds: [],
};
describe("exam range repositories", () => {
  it("maps transport failures to a safe persistence error", async () => {
    const repository = new SupabaseExamRangeRepository(async () => {
      throw new Error("network failure");
    });
    await expect(repository.read(owner, "stu-1")).rejects.toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
    });
  });
  beforeEach(() => curriculumStore.reset());
  it("persists per student and rejects stale and mismatched selections without changing progress", async () => {
    const repository = new MockExamRangeRepository();
    const workspace = await repository.read(owner, "stu-1");
    const item = workspace.items.find((row) => row.type !== "unit" && row.planStatus === "active")!;
    const before = structuredClone(curriculumStore.learningItems);
    await repository.save(owner, { ...baseCommand, itemIds: [item.id] });
    const after = await repository.read(owner, "stu-1");
    expect(after.ranges).toHaveLength(1);
    expect((await repository.read(owner, "stu-2")).ranges).toHaveLength(0);
    expect(curriculumStore.learningItems).toEqual(before);
    const range = after.ranges[0];
    await expect(
      repository.save(owner, {
        ...baseCommand,
        rangeId: range.id,
        revision: 9,
        itemIds: [item.id],
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      repository.save(owner, { ...baseCommand, itemIds: ["foreign"] }),
    ).rejects.toMatchObject({ code: "INVALID_RELATIONSHIP" });
    expect((await repository.read(owner, "stu-1")).ranges[0]).toEqual(range);
  });
  it("rejects missing permission, cross organization and unassigned teacher scope", async () => {
    const repository = new MockExamRangeRepository();
    for (const actor of [
      { ...owner, permissions: [] },
      { ...owner, organizationId: "foreign" },
      { ...owner, scope: { kind: "assigned-classes" as const, classIds: ["unknown"] } },
    ]) {
      await expect(repository.read(actor, "stu-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(repository.save(actor, baseCommand)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
  });
  it("uses JWT client with scoped RPCs and does not fall back on missing schema", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { organizationId: owner.organizationId, studentId: "stu-1", ranges: [], items: [] },
      error: null,
    });
    const factory = vi.fn(async () => ({ rpc }) as unknown as SupabaseClient);
    const repository = new SupabaseExamRangeRepository(factory);
    expect((await repository.read(owner, "stu-1")).ranges).toEqual([]);
    expect(rpc).toHaveBeenCalledWith("read_student_exam_ranges", {
      target_organization_id: owner.organizationId,
      target_student_id: "stu-1",
    });
    rpc.mockResolvedValueOnce({ data: { id: "range" }, error: null });
    await repository.save(owner, baseCommand);
    expect(rpc).toHaveBeenLastCalledWith("save_student_exam_range", {
      target_organization_id: owner.organizationId,
      command: baseCommand,
    });
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST202", message: "missing function" },
    });
    await expect(repository.read(owner, "stu-1")).rejects.toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
    });
    await expect(repository.save({ ...owner, permissions: [] }, baseCommand)).rejects.toMatchObject(
      { code: "FORBIDDEN" },
    );
    expect(factory).toHaveBeenCalledTimes(3);
  });
  it("rejects foreign read envelopes", async () => {
    const repository = new SupabaseExamRangeRepository(
      async () =>
        ({
          rpc: vi.fn().mockResolvedValue({
            data: { organizationId: "foreign", studentId: "stu-1", ranges: [], items: [] },
            error: null,
          }),
        }) as unknown as SupabaseClient,
    );
    await expect(repository.read(owner, "stu-1")).rejects.toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
    });
  });
});
