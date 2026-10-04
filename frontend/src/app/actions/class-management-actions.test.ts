import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import {
  loadClassCreateViewAction,
  loadClassEditViewAction,
  saveClassStateAction,
} from "./class-management-actions";
import { classManagementRepository } from "@/server/repositories/class-management";
import { saveClassWithConfiguredRepository } from "@/server/services/class-management-service";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/audit/audit-service", () => ({
  executeAuditedMutation: vi.fn(({ mutate }: { mutate: () => Promise<unknown> }) => mutate()),
}));
vi.mock("@/server/auth/identity", () => ({
  getAuthorizationContext: vi.fn(async () => ({
    profileId: "owner",
    organizationId: "org-001",
    scope: { kind: "organization-wide" },
  })),
}));
vi.mock("@/server/authorization/policy", () => ({ can: vi.fn(() => true) }));
vi.mock("@/server/repositories/class-management", () => ({
  classManagementRepository: { editor: vi.fn() },
}));
vi.mock("@/server/services/class-management-service", () => ({
  saveClassWithConfiguredRepository: vi.fn(),
  changeClassLifecycleWithConfiguredRepository: vi.fn(),
}));
describe("class management actions", () => {
  beforeEach(() => vi.clearAllMocks());
  it("loads the create editor through the authorized repository boundary", async () => {
    const view = { mode: "create" } as never;
    vi.mocked(classManagementRepository.editor).mockResolvedValue(view);

    await expect(loadClassCreateViewAction()).resolves.toBe(view);
    expect(classManagementRepository.editor).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-001" }),
    );
  });

  it("loads an authorized existing class for the dialog editor", async () => {
    const view = { mode: "edit", capabilities: { canEdit: true } } as never;
    vi.mocked(classManagementRepository.editor).mockResolvedValue(view);

    await expect(loadClassEditViewAction("class-a")).resolves.toBe(view);
    expect(classManagementRepository.editor).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-001" }),
      "class-a",
    );
  });

  it("parses aggregate form input before service", async () => {
    vi.mocked(saveClassWithConfiguredRepository).mockResolvedValue({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "invalid",
    });
    const form = new FormData();
    form.set("name", "測試班");
    form.set("code", "C1");
    form.set("type", "study");
    form.set("teacherId", "teacher");
    form.set("allGrades", "on");
    form.append("studentIds", "stu-1");
    form.set("capacity", "12");
    form.set(
      "schedules",
      JSON.stringify([{ weekday: 2, startTime: "18:30", endTime: "20:30", room: "201" }]),
    );
    await saveClassStateAction({ ok: false, code: "VALIDATION_ERROR", message: "" }, form);
    expect(saveClassWithConfiguredRepository).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: "owner" }),
      expect.objectContaining({
        name: "測試班",
        type: "study",
        allGrades: true,
        capacity: 12,
        studentIds: ["stu-1"],
        schedules: [expect.objectContaining({ weekday: 2 })],
      }),
    );
  });

  it("returns to the class list after creating a class", async () => {
    vi.mocked(saveClassWithConfiguredRepository).mockResolvedValue({
      ok: true,
      code: "OK",
      message: "班級已建立",
      values: { classId: "class-new" } as never,
    });

    await saveClassStateAction(
      { ok: false, code: "VALIDATION_ERROR", message: "" },
      new FormData(),
    );

    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/classes");
  });

  it("keeps existing classes on their edit page after saving", async () => {
    vi.mocked(saveClassWithConfiguredRepository).mockResolvedValue({
      ok: true,
      code: "OK",
      message: "班級已更新",
      values: { classId: "class-a" } as never,
    });
    const form = new FormData();
    form.set("classId", "class-a");

    await saveClassStateAction({ ok: false, code: "VALIDATION_ERROR", message: "" }, form);

    expect(redirect).toHaveBeenCalledWith("/classes/class-a/edit?saved=1");
  });

  it("returns dialog edits to the class list after saving", async () => {
    vi.mocked(saveClassWithConfiguredRepository).mockResolvedValue({
      ok: true,
      code: "OK",
      message: "班級已更新",
      values: { classId: "class-a" } as never,
    });
    const form = new FormData();
    form.set("classId", "class-a");
    form.set("returnTo", "/classes");

    await saveClassStateAction({ ok: false, code: "VALIDATION_ERROR", message: "" }, form);

    expect(redirect).toHaveBeenCalledWith("/classes");
  });
});
