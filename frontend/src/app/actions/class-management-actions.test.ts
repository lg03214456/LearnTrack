import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveClassStateAction } from "./class-management-actions";
import { createClass } from "@/server/services/class-management-service";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/auth/identity", () => ({
  getAuthorizationContext: vi.fn(async () => ({ profileId: "owner" })),
}));
vi.mock("@/server/services/class-management-service", () => ({
  createClass: vi.fn(),
  updateClass: vi.fn(),
  changeClassLifecycle: vi.fn(),
}));
describe("class management actions", () => {
  beforeEach(() => vi.clearAllMocks());
  it("parses aggregate form input before service", async () => {
    vi.mocked(createClass).mockReturnValue({
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
    expect(createClass).toHaveBeenCalledWith(
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
});
