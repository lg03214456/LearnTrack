import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassDailyWorkspace } from "../class-session.types";
import { ClassDailyWorkspaceView } from "./class-daily-workspace";

vi.mock("@/app/actions/class-session-actions", () => ({
  appendCompletedProgressAction: vi.fn(async (state) => state),
  correctDailyProgressAction: vi.fn(),
  saveDailyProgressAction: vi.fn(async (state) => state),
}));

const data: ClassDailyWorkspace = {
  session: {
    id: "s1",
    classId: "c1",
    className: "混齡班",
    classCode: "C1",
    sessionDate: "2026-08-31",
    scheduleLabel: "18:30–20:30",
    teacherName: "林老師",
    status: "draft",
    revision: 1,
  },
  canManage: true,
  history: [],
  members: [
    {
      id: "member-1",
      studentId: "stu-1",
      studentName: "測試學生",
      studentNumber: "S1",
      attendanceStatus: "present",
      needsPlanSetup: false,
      history: [],
      plans: [
        {
          id: "plan-a",
          label: "數學・翰林",
          versionLabel: "版本 1",
          items: [{ id: "item-a", title: "第一章", status: "in_progress", revision: 1 }],
        },
        {
          id: "plan-b",
          label: "英文・康軒",
          versionLabel: "版本 2",
          items: [{ id: "item-b", title: "Unit 1", status: "pending", revision: 1 }],
        },
      ],
    },
    {
      id: "member-2",
      studentId: "stu-2",
      studentName: "請假學生",
      studentNumber: "S2",
      attendanceStatus: "leave",
      needsPlanSetup: false,
      history: [],
      plans: [
        {
          id: "plan-c",
          label: "數學・南一",
          versionLabel: "版本 1",
          items: [{ id: "item-c", title: "單元一", status: "pending", revision: 1 }],
        },
      ],
    },
  ],
};

describe("class daily workspace", () => {
  afterEach(cleanup);

  it("defaults leave students to no update and keeps notes optional", () => {
    render(<ClassDailyWorkspaceView data={data} />);
    expect(screen.getByText("本次不更新；既有教材進度不會被改變。")).toBeInTheDocument();
    expect(screen.getByLabelText("測試學生進度備註")).not.toBeRequired();
  });

  it("adds another progress row and restricts items to the chosen plan", () => {
    render(<ClassDailyWorkspaceView data={data} />);
    fireEvent.click(screen.getAllByRole("button", { name: "新增一筆教材進度" })[0]);
    expect(screen.getAllByLabelText("測試學生教材")).toHaveLength(2);
    fireEvent.change(screen.getAllByLabelText("測試學生教材")[1], {
      target: { value: "plan-b" },
    });
    const itemSelect = screen.getAllByLabelText("測試學生學習單元")[1];
    expect(itemSelect).toHaveTextContent("Unit 1");
    expect(itemSelect).not.toHaveTextContent("第一章");
  });

  it("allows a completed class to batch-add progress with one update action", () => {
    render(
      <ClassDailyWorkspaceView
        data={{ ...data, session: { ...data.session, status: "completed" } }}
      />,
    );
    expect(screen.queryByLabelText("測試學生教材")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "補登一筆教材進度" })[0]);
    expect(screen.getByLabelText("測試學生教材")).toBeInTheDocument();
    expect(screen.getByLabelText("補登原因")).toBeRequired();
    expect(screen.getByRole("button", { name: "統一更新課堂進度" })).toBeInTheDocument();
  });
});
