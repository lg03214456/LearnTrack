import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentDetailView } from "../student-profile.types";
import { StudentDetailManagement } from "./student-detail-management";
import { StudentAssessmentHistory } from "./student-assessment-history";

vi.mock("@/app/actions/student-detail-actions", () => ({
  correctAssessmentResultStateAction: vi.fn(),
  recordExtraAssessmentResultStateAction: vi.fn(),
  recordAssessmentResultStateAction: vi.fn(),
  updateStudentProfileAction: vi.fn(),
}));

const detail: StudentDetailView = {
  profile: {
    id: "student-a",
    number: "STU-0001",
    name: "學生甲",
    gender: "男",
    phone: "",
    school: "",
    grade: "",
    status: "active",
    revision: 1,
    guardians: [],
    classes: [],
  },
  sessions: [],
  assessment: {
    rows: [
      {
        id: "result-a",
        assessmentId: "exam-a",
        title: "第一回",
        termId: "115-1",
        subject: "數學",
        date: "2026-10-01",
        score: 80,
        maximumScore: 100,
        percentage: 80,
        comment: "",
        revision: 1,
        updatedAt: "2026-10-01",
      },
    ],
    exportRows: [],
    summary: { latestPercentage: 80, averagePercentage: 80, resultCount: 1, trend: [] },
    terms: [],
    subjects: [],
    availableAssessments: [
      {
        id: "exam-b",
        title: "第二回",
        termId: "115-1",
        subject: "數學",
        date: "2026-10-02",
        maximumScore: 50,
      },
    ],
    pagination: { page: 1, total: 1, totalPages: 1 },
  },
};

describe("student management dialogs", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens curriculum entry without navigation and returns focus on close", () => {
    render(
      <StudentDetailManagement detail={detail} canManageProfile={false} canManageAssessments />,
    );
    const trigger = screen.getByRole("button", { name: /登錄教材考卷/ });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "登錄教材考卷" });
    fireEvent.change(within(dialog).getByLabelText("教材考卷"), { target: { value: "exam-b" } });
    expect(within(dialog).getByLabelText("分數")).toHaveAttribute("max", "50");
    fireEvent.click(within(dialog).getByRole("button", { name: "關閉" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("opens extra exam entry and closes on native cancel", () => {
    render(
      <StudentDetailManagement detail={detail} canManageProfile={false} canManageAssessments />,
    );
    fireEvent.click(screen.getByRole("button", { name: /新增額外考卷/ }));
    const dialog = screen.getByRole("dialog", { name: "新增額外考卷" });
    expect(within(dialog).getByLabelText("考卷名稱")).toBeInTheDocument();
    fireEvent(dialog, new Event("cancel", { bubbles: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens one correction with its stored score", () => {
    render(
      <StudentDetailManagement detail={detail} canManageProfile={false} canManageAssessments />,
    );
    fireEvent.click(screen.getByRole("button", { name: /更正：數學・第一回/ }));
    expect(within(screen.getByRole("dialog")).getByLabelText("第一回分數")).toHaveValue(80);
  });

  it("explains the empty curriculum selector without allowing submission", () => {
    render(
      <StudentDetailManagement
        detail={{ ...detail, assessment: { ...detail.assessment, availableAssessments: [] } }}
        canManageProfile={false}
        canManageAssessments
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /登錄教材考卷/ }));
    expect(screen.getByText(/目前沒有可登錄的教材考卷/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "登錄成績" })).not.toBeInTheDocument();
  });

  it("does not expose mutations to read-only users", () => {
    render(
      <StudentDetailManagement
        detail={detail}
        canManageProfile={false}
        canManageAssessments={false}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows one result card with direct correction and header entry actions", () => {
    render(
      <StudentAssessmentHistory
        detail={detail}
        filters={{ page: 1, pageSize: 20 }}
        canManageAssessments
      />,
    );
    const card = screen.getByRole("article", { name: "數學・第一回" });
    expect(within(card).getByText("80")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登錄教材考卷" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "更正既有成績" })).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "編輯成績" }));
    expect(screen.getByRole("dialog", { name: "更正：數學・第一回" })).toBeInTheDocument();
  });

  it("keeps result cards read-only without management permission", () => {
    render(<StudentAssessmentHistory detail={detail} filters={{ page: 1, pageSize: 20 }} />);
    expect(screen.getByRole("article", { name: "數學・第一回" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "編輯成績" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "登錄教材考卷" })).not.toBeInTheDocument();
  });

  it("keeps the empty state with no invented cards", () => {
    render(
      <StudentAssessmentHistory
        detail={{
          ...detail,
          assessment: {
            ...detail.assessment,
            rows: [],
            pagination: { page: 1, total: 0, totalPages: 0 },
          },
        }}
        filters={{ page: 1, pageSize: 20 }}
      />,
    );
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText("沒有符合條件的考試紀錄")).toBeInTheDocument();
  });
});
