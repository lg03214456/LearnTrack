import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentSetup } from "./student-setup";
import {
  readStudentSetupAction,
  readStudentLearningSetupAction,
  saveStudentSetupBasicAction,
} from "@/app/actions/student-setup-actions";
import { saveStudentSetupPlanAction } from "@/app/actions/curriculum-actions";
import { saveExamRangeAction } from "@/app/actions/exam-range-actions";
import type { StudentSetupData, StudentLearningSetup } from "../student-setup.types";
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/actions/student-setup-actions", () => ({
  readStudentSetupAction: vi.fn(),
  readStudentLearningSetupAction: vi.fn(),
  saveStudentSetupBasicAction: vi.fn(),
}));
vi.mock("@/app/actions/curriculum-actions", () => ({ saveStudentSetupPlanAction: vi.fn() }));
vi.mock("@/app/actions/exam-range-actions", () => ({ saveExamRangeAction: vi.fn() }));
const setup: StudentSetupData = {
  contextKey: "org:member",
  basic: { name: "", number: "", phone: "", gender: "女", status: "active", classIds: [] },
  classOptions: [{ id: "class", name: "測試班" }],
  canManageClasses: true,
};
const saved = {
  ...setup.basic,
  name: "測試學生",
  phone: "0912345678",
  studentId: "student",
  number: "STU-0001",
  revision: 2,
  classIds: ["class"],
};
const learning: StudentLearningSetup = {
  canManage: true,
  plans: {
    status: "ready",
    value: {
      student: { id: "student", name: "測試學生", number: "STU-0001" },
      plans: [],
      availableVersions: [{ id: "version", label: "測試教材 v1" }],
      terms: [{ id: "term", name: "測試學期" }],
    },
  },
  ranges: {
    status: "ready",
    value: {
      ranges: [],
      items: [
        {
          id: "item",
          title: "測試章節",
          type: "chapter",
          status: "pending",
          planId: "plan",
          planLabel: "測試教材",
          planStatus: "active",
        },
      ],
    },
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  vi.mocked(readStudentSetupAction).mockResolvedValue({ status: "ready", value: setup });
  vi.mocked(readStudentLearningSetupAction).mockResolvedValue(learning);
  vi.mocked(saveStudentSetupBasicAction).mockResolvedValue({
    ok: true,
    code: "OK",
    message: "已儲存",
    values: saved,
  });
  vi.mocked(saveStudentSetupPlanAction).mockResolvedValue({
    ok: true,
    code: "OK",
    message: "已儲存",
  });
  vi.mocked(saveExamRangeAction).mockResolvedValue({ ok: true, message: "已儲存" });
});
afterEach(cleanup);
async function open() {
  render(<StudentSetup contextKey="org:member" />);
  fireEvent.click(screen.getByRole("button", { name: "新增學生" }));
  await screen.findByLabelText("學生姓名");
}
async function saveBasic() {
  fireEvent.change(screen.getByLabelText("學生姓名"), { target: { value: "測試學生" } });
  fireEvent.change(screen.getByLabelText("聯絡電話"), { target: { value: "0912345678" } });
  fireEvent.click(screen.getByLabelText("測試班"));
  fireEvent.click(screen.getByRole("button", { name: "儲存並設定教材" }));
  await screen.findByRole("button", { name: "儲存教材" });
}
describe("continuous student setup", () => {
  it("cancels an unstarted setup without writes and returns focus", async () => {
    render(<StudentSetup contextKey="org:member" />);
    const trigger = screen.getByRole("button", { name: "新增學生" });
    trigger.focus();
    fireEvent.click(trigger);
    await screen.findByLabelText("學生姓名");
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(saveStudentSetupBasicAction).not.toHaveBeenCalled();
  });
  it("creates once, updates with saved identity/revision when going back, and resets for another student", async () => {
    await open();
    await saveBasic();
    expect(screen.getByText(/STU-0001/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "返回學生資料" }));
    expect(screen.getByLabelText("學生姓名")).toHaveValue("測試學生");
    fireEvent.click(screen.getByRole("button", { name: "儲存並結束" }));
    await screen.findByRole("link", { name: "查看學生個人資料" });
    const form = vi.mocked(saveStudentSetupBasicAction).mock.calls[1][2];
    expect(form.get("studentId")).toBe("student");
    expect(form.get("revision")).toBe("2");
    fireEvent.click(screen.getByRole("button", { name: "新增下一位" }));
    expect(screen.getByLabelText("學生姓名")).toHaveValue("");
    expect(screen.getByLabelText("學號")).toHaveValue("");
    expect(screen.getByLabelText("測試班")).not.toBeChecked();
  });
  it("saves material without navigation, reloads authoritative ranges, and uses one modal", async () => {
    await open();
    await saveBasic();
    fireEvent.change(screen.getByLabelText("教材版本"), { target: { value: "version" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存教材" }));
    await waitFor(() =>
      expect(saveStudentSetupPlanAction).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: "student", versionId: "version" }),
      ),
    );
    await screen.findByRole("button", { name: "繼續設定段考" });
    fireEvent.click(screen.getByRole("button", { name: "繼續設定段考" }));
    await screen.findByLabelText("段考名稱");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("段考名稱"), { target: { value: "第一次段考" } });
    fireEvent.click(screen.getByLabelText("測試章節"));
    fireEvent.click(screen.getByRole("button", { name: "儲存範圍" }));
    await screen.findByRole("link", { name: "查看學生個人資料" });
    expect(saveStudentSetupBasicAction).toHaveBeenCalledTimes(1);
    expect(saveExamRangeAction).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: "student", itemIds: ["item"] }),
      "org:member",
    );
  });
  it("allows defer without dependent writes and preserves the saved profile link", async () => {
    await open();
    await saveBasic();
    fireEvent.click(screen.getByRole("button", { name: "稍後設定／結束" }));
    expect(screen.getByRole("link", { name: "查看學生個人資料" })).toHaveAttribute(
      "href",
      "/students/student?tab=plans",
    );
    expect(saveStudentSetupPlanAction).not.toHaveBeenCalled();
    expect(saveExamRangeAction).not.toHaveBeenCalled();
  });
  it("blocks retry and later writes after an uncertain creation", async () => {
    vi.mocked(saveStudentSetupBasicAction).mockRejectedValue(new Error("transport"));
    await open();
    fireEvent.change(screen.getByLabelText("學生姓名"), { target: { value: "測試" } });
    fireEvent.change(screen.getByLabelText("聯絡電話"), { target: { value: "0912345678" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存並設定教材" }));
    await screen.findByText(/為避免重複建立已停止重送/);
    expect(screen.getByRole("button", { name: "儲存並設定教材" })).toBeDisabled();
    expect(readStudentLearningSetupAction).not.toHaveBeenCalled();
  });
  it("keeps input on validation failure and leaves classes untouched without class permission", async () => {
    vi.mocked(readStudentSetupAction).mockResolvedValue({
      status: "ready",
      value: { ...setup, canManageClasses: false },
    });
    vi.mocked(saveStudentSetupBasicAction).mockImplementation(async (_key, _previous, form) => ({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "電話格式錯誤",
      values: { ...setup.basic, name: String(form.get("name")), phone: String(form.get("phone")) },
    }));
    await open();
    fireEvent.change(screen.getByLabelText("學生姓名"), { target: { value: "保留姓名" } });
    fireEvent.change(screen.getByLabelText("聯絡電話"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存並設定教材" }));
    await screen.findByText("電話格式錯誤");
    expect(screen.getByLabelText("學生姓名")).toHaveValue("保留姓名");
    expect(
      vi.mocked(saveStudentSetupBasicAction).mock.calls[0][2].get("includesClassManagement"),
    ).toBe("false");
  });
  it("blocks dismissal and duplicate submit while pending and returns focus after cancellation", async () => {
    vi.mocked(saveStudentSetupBasicAction).mockReturnValue(new Promise(() => {}));
    await open();
    fireEvent.change(screen.getByLabelText("學生姓名"), { target: { value: "測試" } });
    fireEvent.change(screen.getByLabelText("聯絡電話"), { target: { value: "0912345678" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存並設定教材" }));
    expect(screen.getByRole("button", { name: /關閉1/ })).toBeDisabled();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(saveStudentSetupBasicAction).toHaveBeenCalledTimes(1);
  });
  it("hides stale results after context changes", async () => {
    const { rerender } = render(<StudentSetup contextKey="org:member" studentId="student" />);
    vi.mocked(readStudentSetupAction).mockResolvedValue({
      status: "ready",
      value: { ...setup, basic: saved },
    });
    fireEvent.click(screen.getByRole("button", { name: "基本資料／班級與學習設定" }));
    await screen.findByDisplayValue("測試學生");
    rerender(<StudentSetup contextKey="other:member" studentId="other" />);
    await screen.findByText("登入身分已變更，請重新載入頁面。");
    expect(screen.queryByDisplayValue("測試學生")).not.toBeInTheDocument();
  });
});
