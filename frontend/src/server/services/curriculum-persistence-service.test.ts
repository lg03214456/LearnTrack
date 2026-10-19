import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { authRuntimeConfig } from "@/server/auth/provider-config";
import { supabaseCurriculumRepository } from "@/server/repositories/curriculum-supabase";
import { RepositoryError } from "@/server/repositories/repository-error";
import * as mock from "./curriculum-service";
import {
  createTemplate,
  createAndActivatePlan,
  adjustLearningItem,
} from "./curriculum-persistence-service";

vi.mock("@/server/auth/provider-config", () => ({ authRuntimeConfig: vi.fn() }));
vi.mock("@/server/repositories/curriculum-supabase", () => ({
  supabaseCurriculumRepository: { mutate: vi.fn() },
}));
vi.mock("./curriculum-service", () => ({
  createTemplate: vi.fn(),
  createAndActivatePlan: vi.fn(),
  adjustLearningItem: vi.fn(),
}));
describe("curriculum persistence service", () => {
  const actor = resolveMockIdentity("owner");
  const command = { name: "教材", gradeId: "g7", subjectId: "math", publisherId: "custom" };
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authRuntimeConfig).mockReturnValue({ domainDataProvider: "supabase" } as never);
    vi.mocked(supabaseCurriculumRepository.mutate).mockResolvedValue("ver-db");
  });
  it("returns the durable version identifier, never a Mock identifier", async () => {
    expect(await createTemplate(actor, command)).toEqual({
      ok: true,
      code: "OK",
      message: "ver-db",
    });
    expect(mock.createTemplate).not.toHaveBeenCalled();
  });
  it("sends replacement and revision-guarded progress to the same database", async () => {
    const plan = { studentId: "stu-db", versionId: "ver-db", termId: "115-1" };
    const item = { itemId: "learn-db", revision: 3, status: "completed" as const };
    await createAndActivatePlan(actor, plan);
    await adjustLearningItem(actor, item);
    expect(supabaseCurriculumRepository.mutate).toHaveBeenCalledWith(actor, "replacePlan", plan);
    expect(supabaseCurriculumRepository.mutate).toHaveBeenCalledWith(actor, "adjustItem", item);
  });
  it.each(["CONFLICT", "FORBIDDEN", "NOT_FOUND", "INVALID_RELATIONSHIP"] as const)(
    "does not report %s as saved",
    async (code) => {
      vi.mocked(supabaseCurriculumRepository.mutate).mockRejectedValue(new RepositoryError(code));
      expect(await createTemplate(actor, command)).toMatchObject({
        ok: false,
        code: code === "INVALID_RELATIONSHIP" ? "VALIDATION_ERROR" : code,
      });
      expect(mock.createTemplate).not.toHaveBeenCalled();
    },
  );
  it("fails closed on absent migrations/network failures", async () => {
    vi.mocked(supabaseCurriculumRepository.mutate).mockRejectedValue(
      new RepositoryError("PERSISTENCE_UNAVAILABLE"),
    );
    await expect(createTemplate(actor, command)).rejects.toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
    });
    expect(mock.createTemplate).not.toHaveBeenCalled();
  });
  it("uses Mock only when explicitly configured", async () => {
    vi.mocked(authRuntimeConfig).mockReturnValue({ domainDataProvider: "mock" } as never);
    vi.mocked(mock.createTemplate).mockReturnValue({ ok: true, code: "OK", message: "ver-mock" });
    expect(await createTemplate(actor, command)).toMatchObject({ message: "ver-mock" });
    expect(supabaseCurriculumRepository.mutate).not.toHaveBeenCalled();
  });
});
