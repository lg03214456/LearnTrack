import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./page";
import { getAuthorizationContext } from "@/server/auth/identity";
import { curriculumRepository } from "@/server/repositories/curriculum";
import { examRangeRepository } from "@/server/repositories/exam-ranges";
import { studentDetailRepository } from "@/server/repositories/student-detail";
import { RepositoryError } from "@/server/repositories/repository-error";
import { resolveMockIdentity } from "@/server/auth/identity-core";
vi.mock("@/server/auth/identity", () => ({ getAuthorizationContext: vi.fn() }));
vi.mock("@/server/repositories/curriculum", () => ({
  curriculumRepository: { studentPlans: vi.fn() },
}));
vi.mock("@/server/repositories/exam-ranges", () => ({ examRangeRepository: { read: vi.fn() } }));
vi.mock("@/server/repositories/student-detail", () => ({
  studentDetailRepository: { get: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/features/curriculum/components/student-study-plans", () => ({
  StudentStudyPlansView: () => <div>ORIGINAL_PLANS</div>,
}));
vi.mock("@/features/student-profile/components/student-detail-management", () => ({
  StudentDetailManagement: () => null,
}));
vi.mock("@/features/student-profile/components/student-profile-overview", () => ({
  StudentProfileHero: () => null,
  StudentProfileOverview: () => <div>OVERVIEW</div>,
  StudentAssessmentHistory: () => null,
}));
vi.mock("@/features/student-profile/components/student-session-history", () => ({
  StudentSessionHistory: () => null,
}));
vi.mock("@/app/actions/exam-range-actions", () => ({ saveExamRangeAction: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthorizationContext).mockResolvedValue(resolveMockIdentity("owner"));
  vi.mocked(studentDetailRepository.get).mockResolvedValue({
    profile: { id: "stu-1", name: "測試學生", classes: [] },
  } as never);
  vi.mocked(curriculumRepository.studentPlans).mockResolvedValue({
    student: { id: "stu-1" },
    plans: [],
    availableVersions: [],
    terms: [],
  } as never);
  vi.mocked(examRangeRepository.read).mockResolvedValue({ ranges: [], items: [] });
});
afterEach(cleanup);
const load = (tab: string) =>
  Page({ params: Promise.resolve({ studentId: "stu-1" }), searchParams: Promise.resolve({ tab }) });
describe("student exam range route composition", () => {
  it("does not load exam ranges on unrelated tabs", async () => {
    render(await load("overview"));
    expect(examRangeRepository.read).not.toHaveBeenCalled();
    expect(curriculumRepository.studentPlans).not.toHaveBeenCalled();
    expect(screen.getByText("OVERVIEW")).toBeInTheDocument();
  });
  it("loads scoped ranges only with the visible student's plans", async () => {
    render(await load("plans"));
    expect(examRangeRepository.read).toHaveBeenCalledWith(
      expect.objectContaining({ actorType: "organization" }),
      "stu-1",
    );
    expect(screen.getByText(/尚未設定段考範圍/)).toBeInTheDocument();
    expect(screen.getByText("ORIGINAL_PLANS")).toBeInTheDocument();
  });
  it("keeps existing plans available when the range migration is missing", async () => {
    vi.mocked(examRangeRepository.read).mockRejectedValue(
      new RepositoryError("PERSISTENCE_UNAVAILABLE"),
    );
    render(await load("plans"));
    expect(screen.getByRole("alert")).toHaveTextContent("SQL 更新");
    expect(screen.getByText("ORIGINAL_PLANS")).toBeInTheDocument();
  });
  it("does not query range data before student visibility succeeds", async () => {
    vi.mocked(studentDetailRepository.get).mockResolvedValue(undefined);
    await expect(load("plans")).rejects.toThrow("NOT_FOUND");
    expect(examRangeRepository.read).not.toHaveBeenCalled();
  });
});
