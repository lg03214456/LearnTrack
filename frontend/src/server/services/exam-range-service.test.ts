import { describe, expect, it, vi } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import type { ExamRangeRepository } from "@/server/repositories/exam-ranges-contract";
import { RepositoryError } from "@/server/repositories/repository-error";
import { saveExamRange } from "./exam-range-service";
import type { SaveExamRangeCommand } from "@/features/curriculum/exam-range.types";

const actor = resolveMockIdentity("owner");
const command: SaveExamRangeCommand = {
  studentId: "student",
  rangeId: null,
  revision: 0,
  name: "段考",
  examDate: null,
  itemIds: ["a"],
};
const setup = () =>
  ({
    read: vi.fn().mockResolvedValue({
      ranges: [],
      items: [{ id: "a", planId: "p", type: "chapter", planStatus: "active", status: "completed" }],
    }),
    save: vi.fn().mockResolvedValue(undefined),
  }) satisfies ExamRangeRepository;
describe("exam range service", () => {
  it("validates and saves through the repository interface", async () => {
    const repository = setup();
    expect(await saveExamRange(actor, { ...command, name: " 段考 " }, repository)).toMatchObject({
      ok: true,
    });
    expect(repository.save).toHaveBeenCalledWith(actor, { ...command, name: "段考" });
  });
  it("does not read or mutate without permission", async () => {
    const repository = setup();
    expect(await saveExamRange({ ...actor, permissions: [] }, command, repository)).toMatchObject({
      ok: false,
    });
    expect(repository.read).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });
  it("rejects invalid selections before writes", async () => {
    const repository = setup();
    expect(await saveExamRange(actor, { ...command, itemIds: [] }, repository)).toMatchObject({
      ok: false,
    });
    expect(repository.save).not.toHaveBeenCalled();
  });
  it.each(["FORBIDDEN", "CONFLICT", "PERSISTENCE_UNAVAILABLE"] as const)(
    "returns a safe error for %s",
    async (code) => {
      const repository = setup();
      repository.save.mockRejectedValueOnce(new RepositoryError(code));
      expect(await saveExamRange(actor, command, repository)).toMatchObject({ ok: false });
    },
  );
});
