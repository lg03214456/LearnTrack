import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./page";
import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";
import { classSessionRepository } from "@/server/repositories/class-session";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("@/app/actions/class-session-actions", () => ({
  completeClassSessionAction: vi.fn(),
  openClassSessionAction: vi.fn(),
}));
vi.mock("@/server/auth/identity", () => ({ getAuthorizationContext: vi.fn() }));
vi.mock("@/server/authorization/policy", () => ({ can: vi.fn() }));
vi.mock("@/server/repositories/class-session", () => ({
  classSessionRepository: { open: vi.fn() },
}));
vi.mock("@/components/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/features/access-control/components/access-denied", () => ({
  AccessDenied: () => <div>ACCESS_DENIED</div>,
}));
vi.mock("@/features/class-sessions/components/class-daily-workspace", () => ({
  ClassDailyWorkspaceView: () => <div>WORKSPACE</div>,
  ClassSessionHistory: () => <div>HISTORY</div>,
}));

const actor = { profileId: "teacher" };
const workspace = {
  session: {
    id: "session-1",
    className: "國中數學 A班",
    sessionDate: "2026-08-31",
    scheduleLabel: "週一 18:30",
    teacherName: "林老師",
    status: "draft",
    revision: 1,
  },
  canManage: true,
};

describe("class daily workspace route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthorizationContext).mockResolvedValue(actor as never);
    vi.mocked(can).mockReturnValue(true);
    vi.mocked(classSessionRepository.open).mockReturnValue(workspace as never);
  });

  it("renders the dated workspace and second-level back action", async () => {
    render(
      await Page({
        params: Promise.resolve({ classId: "cls-1" }),
        searchParams: Promise.resolve({ date: "2026-08-31" }),
      }),
    );
    expect(screen.getByRole("heading", { name: /國中數學 A班・今日課堂/ })).toBeVisible();
    expect(screen.getByText("WORKSPACE")).toBeVisible();
    expect(classSessionRepository.open).toHaveBeenCalledWith(actor, "cls-1", "2026-08-31");
  });

  it("renders access denied before reading class data", async () => {
    vi.mocked(can).mockReturnValue(false);
    render(
      await Page({
        params: Promise.resolve({ classId: "cls-1" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText("ACCESS_DENIED")).toBeVisible();
    expect(classSessionRepository.open).not.toHaveBeenCalled();
  });

  it("uses the not-found state when the class is outside scope", async () => {
    vi.mocked(classSessionRepository.open).mockReturnValue(undefined);
    await expect(
      Page({ params: Promise.resolve({ classId: "missing" }), searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
