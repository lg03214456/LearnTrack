import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassDailyWorkspace } from "../class-session.types";
import {
  BatchDailyProgressEditor as ClassDailyWorkspaceView,
  ClassDailyWorkspaceView as ChecklistWorkspace,
} from "./class-daily-workspace";
import {
  appendCompletedProgressAction,
  saveDailyProgressAction,
} from "@/app/actions/class-session-actions";
import { buildCheckedProgressEntries } from "../progress-checklist";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

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

describe("student progress checklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
    vi.mocked(saveDailyProgressAction).mockResolvedValue({
      ok: true,
      code: "OK",
      message: "已儲存",
    });
    vi.mocked(appendCompletedProgressAction).mockResolvedValue({
      ok: true,
      code: "OK",
      message: "已補登",
    });
  });
  afterEach(cleanup);
  const openStudent = () => fireEvent.click(screen.getByRole("button", { name: "測試學生" }));
  const dialog = () => within(screen.getByRole("dialog"));

  it("starts with no selected changes and cancels without saving, restoring focus", () => {
    render(<ChecklistWorkspace data={data} />);
    const trigger = screen.getByRole("button", { name: "測試學生" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(dialog().getByRole("button", { name: "確認儲存" })).toBeDisabled();
    expect(dialog().getByLabelText("本次備註（選填）")).not.toBeRequired();
    fireEvent.click(dialog().getByLabelText(/第一章/));
    fireEvent.click(dialog().getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(saveDailyProgressAction).not.toHaveBeenCalled();
    openStudent();
    expect(dialog().getByLabelText(/第一章/)).not.toBeChecked();
  });

  it("submits only the selected student's own multi-plan items with original revisions and refreshes", async () => {
    render(<ChecklistWorkspace data={data} />);
    openStudent();
    expect(dialog().queryByText("單元一")).not.toBeInTheDocument();
    fireEvent.click(dialog().getByLabelText(/第一章/));
    fireEvent.click(dialog().getByLabelText(/Unit 1/));
    fireEvent.change(dialog().getByLabelText("本次備註（選填）"), {
      target: { value: "  完成練習  " },
    });
    fireEvent.click(dialog().getByRole("button", { name: "確認儲存" }));
    await waitFor(() => expect(saveDailyProgressAction).toHaveBeenCalledTimes(1));
    const form = vi.mocked(saveDailyProgressAction).mock.calls[0][1];
    expect(form.get("sessionId")).toBe("s1");
    expect(form.get("sessionRevision")).toBe("1");
    expect(JSON.parse(String(form.get("entries")))).toEqual([
      {
        sessionMemberId: "member-1",
        studentId: "stu-1",
        studyPlanId: "plan-a",
        learningItemId: "item-a",
        learningItemRevision: 1,
        status: "completed",
        note: "完成練習",
      },
      {
        sessionMemberId: "member-1",
        studentId: "stu-1",
        studyPlanId: "plan-b",
        learningItemId: "item-b",
        learningItemRevision: 1,
        status: "completed",
        note: "完成練習",
      },
    ]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(appendCompletedProgressAction).not.toHaveBeenCalled();
  });

  it("keeps previous completed items checked and readonly without resubmitting them", () => {
    const completed = structuredClone(data);
    completed.members[0].plans[0].items[0].status = "completed";
    render(<ChecklistWorkspace data={completed} />);
    openStudent();
    const item = dialog().getByLabelText(/第一章/);
    expect(item).toBeChecked();
    expect(item).toBeDisabled();
    expect(
      buildCheckedProgressEntries(
        completed.members[0],
        new Set(["item-a", "item-b", "item-c", "forged"]),
        "",
      ),
    ).toEqual([expect.objectContaining({ learningItemId: "item-b" })]);
  });

  it("preserves selected input after validation rejection, but requires reload for a conflict", async () => {
    vi.mocked(saveDailyProgressAction)
      .mockResolvedValueOnce({ ok: false, code: "VALIDATION_ERROR", message: "請確認資料" })
      .mockResolvedValueOnce({ ok: false, code: "CONFLICT", message: "資料已被更新" });
    render(<ChecklistWorkspace data={data} />);
    openStudent();
    fireEvent.click(dialog().getByLabelText(/第一章/));
    fireEvent.click(dialog().getByRole("button", { name: "確認儲存" }));
    await screen.findByText("請確認資料");
    expect(dialog().getByLabelText(/第一章/)).toBeChecked();
    fireEvent.click(dialog().getByRole("button", { name: "確認儲存" }));
    await screen.findByText("資料已被更新");
    expect(dialog().getByRole("button", { name: "確認儲存" })).toBeDisabled();
    fireEvent.click(dialog().getByRole("button", { name: "重新載入確認紀錄" }));
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not retry an uncertain save and leaves a safe reload option", async () => {
    vi.mocked(saveDailyProgressAction).mockRejectedValue(new Error("AUDIT_UNAVAILABLE"));
    render(<ChecklistWorkspace data={data} />);
    openStudent();
    fireEvent.click(dialog().getByLabelText(/第一章/));
    fireEvent.click(dialog().getByRole("button", { name: "確認儲存" }));
    await screen.findByText(/無法確認儲存結果/);
    expect(dialog().getByRole("button", { name: "確認儲存" })).toBeDisabled();
    expect(saveDailyProgressAction).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("blocks duplicate submissions and Escape dismissal while saving", async () => {
    vi.mocked(saveDailyProgressAction).mockReturnValue(new Promise(() => {}));
    render(<ChecklistWorkspace data={data} />);
    openStudent();
    fireEvent.click(dialog().getByLabelText(/第一章/));
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(saveDailyProgressAction).toHaveBeenCalledTimes(1);
    expect(dialog().getByRole("button", { name: "取消" })).toBeDisabled();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("requires a reason and uses the existing completed-session append action", async () => {
    render(
      <ChecklistWorkspace data={{ ...data, session: { ...data.session, status: "completed" } }} />,
    );
    openStudent();
    expect(dialog().getByLabelText("補登原因")).toBeRequired();
    fireEvent.click(dialog().getByLabelText(/第一章/));
    fireEvent.change(dialog().getByLabelText("補登原因"), { target: { value: "課後補登" } });
    fireEvent.click(dialog().getByRole("button", { name: "確認儲存" }));
    await waitFor(() => expect(appendCompletedProgressAction).toHaveBeenCalledTimes(1));
    expect(saveDailyProgressAction).not.toHaveBeenCalled();
    expect(vi.mocked(appendCompletedProgressAction).mock.calls[0][1].get("reason")).toBe(
      "課後補登",
    );
  });

  it("keeps leave students unselected and shows no-material and readonly states", () => {
    const noPlans = structuredClone(data);
    noPlans.members[0].plans = [];
    noPlans.members[0].needsPlanSetup = true;
    const { rerender } = render(<ChecklistWorkspace data={noPlans} />);
    openStudent();
    expect(dialog().getByText(/尚無可登記的教材內容/)).toBeInTheDocument();
    expect(dialog().getByRole("button", { name: "確認儲存" })).toBeDisabled();
    fireEvent.click(dialog().getByRole("button", { name: "取消" }));
    fireEvent.click(screen.getByRole("button", { name: "請假學生" }));
    expect(dialog().getByLabelText(/單元一/)).not.toBeChecked();
    fireEvent.click(dialog().getByRole("button", { name: "取消" }));
    rerender(<ChecklistWorkspace data={{ ...data, canManage: false }} />);
    openStudent();
    expect(dialog().getByLabelText(/第一章/)).toBeDisabled();
    expect(dialog().queryByRole("button", { name: "確認儲存" })).not.toBeInTheDocument();
    expect(screen.queryByText(/進階登記/)).not.toBeInTheDocument();
  });

  it("clears dialog state on session/date/membership changes", () => {
    const { rerender } = render(<ChecklistWorkspace data={data} contextKey="A:member" />);
    openStudent();
    fireEvent.click(dialog().getByLabelText(/第一章/));
    rerender(<ChecklistWorkspace data={data} contextKey="B:member" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    openStudent();
    expect(dialog().getByLabelText(/第一章/)).not.toBeChecked();
    rerender(
      <ChecklistWorkspace
        data={{ ...data, session: { ...data.session, sessionDate: "2026-09-01" } }}
        contextKey="B:member"
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exposes only student confirmation instead of a redundant batch-save workflow", () => {
    render(<ChecklistWorkspace data={data} />);
    expect(screen.queryByText(/進階登記/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "統一更新課堂進度", hidden: true }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "測試學生" })).toBeEnabled();
    openStudent();
    expect(dialog().getByRole("button", { name: "確認儲存" })).toBeInTheDocument();
    expect(saveDailyProgressAction).not.toHaveBeenCalled();
  });
});
