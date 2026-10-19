import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveExamRangeAction } from "@/app/actions/exam-range-actions";
import type { ExamRangeWorkspace } from "../exam-range.types";
import { StudentExamRanges } from "./student-exam-ranges";
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/actions/exam-range-actions", () => ({ saveExamRangeAction: vi.fn() }));
const workspace: ExamRangeWorkspace = {
  ranges: [
    {
      id: "range",
      studentId: "student",
      organizationId: "org",
      name: "第一次段考",
      examDate: "2026-11-01",
      revision: 1,
      itemIds: ["a", "b"],
    },
  ],
  items: [
    {
      id: "unit",
      planId: "plan",
      planLabel: "數學 v1",
      planStatus: "active",
      type: "unit",
      title: "整數單元",
      status: "pending",
    },
    {
      id: "a",
      parentId: "unit",
      planId: "plan",
      planLabel: "數學 v1",
      planStatus: "active",
      type: "chapter",
      title: "加法",
      status: "completed",
    },
    {
      id: "b",
      parentId: "unit",
      planId: "plan",
      planLabel: "數學 v1",
      planStatus: "active",
      type: "worksheet",
      title: "減法",
      status: "pending",
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);
describe("student exam ranges", () => {
  it("dismisses with Escape and returns focus to the triggering control", () => {
    render(<StudentExamRanges studentId="student" workspace={workspace} canManage />);
    const trigger = screen.getByRole("button", { name: "設定段考範圍" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it("does not retain a previous student's open editor when switching students", () => {
    const { rerender } = render(
      <StudentExamRanges studentId="student" workspace={workspace} canManage />,
    );
    fireEvent.click(screen.getByRole("button", { name: "編輯第一次段考範圍" }));
    expect(screen.getByLabelText("段考名稱")).toHaveValue("第一次段考");
    rerender(
      <StudentExamRanges studentId="other" workspace={{ ranges: [], items: [] }} canManage />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("第一次段考")).not.toBeInTheDocument();
  });
  it("refreshes the derived percentage when authoritative learning status changes", () => {
    const { rerender } = render(
      <StudentExamRanges studentId="student" workspace={workspace} canManage={false} />,
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
    rerender(
      <StudentExamRanges
        studentId="student"
        workspace={{
          ...workspace,
          items: workspace.items.map((item) => ({ ...item, status: "completed" })),
        }}
        canManage={false}
      />,
    );
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
  it("shows scoped completion and version without mixing scores", () => {
    render(<StudentExamRanges studentId="student" workspace={workspace} canManage={false} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("數學 v1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /設定|編輯/ })).not.toBeInTheDocument();
  });
  it("opens one create dialog, selects a unit without counting it, and cancels without saving", () => {
    render(<StudentExamRanges studentId="student" workspace={workspace} canManage />);
    fireEvent.click(screen.getByRole("button", { name: "設定段考範圍" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.click(screen.getByLabelText("整數單元（整個單元）"));
    expect(screen.getByText("已選 2 項")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(saveExamRangeAction).not.toHaveBeenCalled();
  });
  it("saves edited coverage with expected revision and refreshes after success", async () => {
    vi.mocked(saveExamRangeAction).mockResolvedValue({ ok: true, message: "已儲存" });
    render(<StudentExamRanges studentId="student" workspace={workspace} canManage />);
    fireEvent.click(screen.getByRole("button", { name: "編輯第一次段考範圍" }));
    fireEvent.change(screen.getByLabelText("段考名稱"), { target: { value: "第二次段考" } });
    fireEvent.click(screen.getByLabelText("減法"));
    fireEvent.submit(screen.getByRole("button", { name: "儲存範圍" }).closest("form")!);
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(saveExamRangeAction).toHaveBeenCalledWith({
      studentId: "student",
      rangeId: "range",
      revision: 1,
      name: "第二次段考",
      examDate: "2026-11-01",
      itemIds: ["a"],
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("retains input and dialog on conflict", async () => {
    vi.mocked(saveExamRangeAction).mockResolvedValue({
      ok: false,
      message: "範圍已被更新，請重新載入",
    });
    render(<StudentExamRanges studentId="student" workspace={workspace} canManage />);
    fireEvent.click(screen.getByRole("button", { name: "編輯第一次段考範圍" }));
    fireEvent.submit(screen.getByRole("button", { name: "儲存範圍" }).closest("form")!);
    await screen.findByRole("alert");
    expect(screen.getByLabelText("段考名稱")).toHaveValue("第一次段考");
    expect(refresh).not.toHaveBeenCalled();
  });
  it("protects the dialog while saving, including Escape and close button", async () => {
    let resolve!: (value: { ok: boolean; message: string }) => void;
    vi.mocked(saveExamRangeAction).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<StudentExamRanges studentId="student" workspace={workspace} canManage />);
    fireEvent.click(screen.getByRole("button", { name: "編輯第一次段考範圍" }));
    fireEvent.submit(screen.getByRole("button", { name: "儲存範圍" }).closest("form")!);
    expect(screen.getByRole("button", { name: "儲存中…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "關閉編輯段考範圍" })).toBeDisabled();
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { bubbles: false, cancelable: true }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    resolve({ ok: false, message: "測試拒絕" });
    await screen.findByText("測試拒絕");
  });
  it("shows missing-schema retry rather than fabricated zero and handles empty choices", () => {
    const { rerender } = render(
      <StudentExamRanges studentId="student" workspace={null} canManage />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("SQL 更新");
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新載入段考範圍" }));
    expect(refresh).toHaveBeenCalledOnce();
    rerender(
      <StudentExamRanges studentId="student" workspace={{ ranges: [], items: [] }} canManage />,
    );
    fireEvent.click(screen.getByRole("button", { name: "設定段考範圍" }));
    expect(screen.getByText(/沒有可選的教材內容/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "儲存範圍" })).toBeDisabled();
  });
  it("retains replaced material references and shows a review warning", () => {
    render(
      <StudentExamRanges
        studentId="student"
        workspace={{
          ...workspace,
          items: workspace.items.map((item) => ({ ...item, planStatus: "replaced" })),
        }}
        canManage
      />,
    );
    expect(screen.getByText(/舊紀錄與原範圍仍保留/)).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "編輯第一次段考範圍" }));
    expect(screen.getByLabelText(/加法/)).toBeChecked();
  });
});
