import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveClassAttendanceAction } from "@/app/actions/class-attendance-actions";
import type { ClassDailyWorkspace } from "../class-session.types";
import { ClassAttendanceDialog } from "./class-attendance-dialog";
vi.mock("@/app/actions/class-attendance-actions", () => ({ saveClassAttendanceAction: vi.fn() }));
const data: ClassDailyWorkspace = {
  session: {
    id: "lesson",
    classId: "class",
    className: "班級",
    classCode: "C1",
    sessionDate: "2026-10-19",
    status: "draft",
    revision: 3,
    teacherName: "老師",
    scheduleLabel: "18:30–20:30",
  },
  members: ["甲", "乙"].map((name, index) => ({
    id: `m${index}`,
    studentId: `s${index}`,
    studentName: `學生${name}`,
    studentNumber: `STU-000${index}`,
    attendanceStatus: "pending",
    plans: [],
    needsPlanSetup: true,
    history: [],
  })),
  history: [],
  canManage: true,
  attendanceAvailable: true,
  canManageAttendance: true,
};
const onClose = vi.fn();
const onSaved = vi.fn();
const onReload = vi.fn();
const show = (workspace = data) =>
  render(
    <ClassAttendanceDialog
      data={workspace}
      onClose={onClose}
      onSaved={onSaved}
      onReload={onReload}
    />,
  );
beforeEach(() => {
  vi.resetAllMocks();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  vi.mocked(saveClassAttendanceAction).mockResolvedValue({
    ok: true,
    code: "OK",
    message: "課堂點名已儲存",
  });
});
afterEach(cleanup);
describe("attendance dialog", () => {
  it("does not preselect attendance and cancellation writes nothing", () => {
    show();
    expect(
      screen.getAllByRole("radio").filter((radio) => (radio as HTMLInputElement).checked),
    ).toHaveLength(0);
    expect(screen.getByRole("button", { name: "確認儲存（0 人）" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(saveClassAttendanceAction).not.toHaveBeenCalled();
  });
  it("selects exclusive statuses, reveals optional late time and saves only changed members", async () => {
    show();
    const student = within(screen.getByRole("group", { name: "學生甲 · STU-0000" }));
    fireEvent.click(student.getByRole("radio", { name: "出席" }));
    fireEvent.click(student.getByRole("radio", { name: "遲到" }));
    expect(student.getByRole("radio", { name: "出席" })).not.toBeChecked();
    fireEvent.change(student.getByLabelText("實際到課時間（選填）", { exact: false }), {
      target: { value: "18:42" },
    });
    fireEvent.click(screen.getByRole("button", { name: "確認儲存（1 人）" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("課堂點名已儲存"));
    const payload = JSON.parse(
      vi.mocked(saveClassAttendanceAction).mock.calls[0][0].get("command") as string,
    );
    expect(payload).toMatchObject({
      sessionRevision: 3,
      entries: [{ sessionMemberId: "m0", studentId: "s0", status: "late", arrivalTime: "18:42" }],
    });
    expect(payload.entries).toHaveLength(1);
  });
  it("requires a reason for corrections, and reverting the draft submits no changes", () => {
    show({
      ...data,
      members: [
        {
          ...data.members[0],
          attendanceStatus: "present",
          attendance: { id: "old", revision: 1, recordedAt: "2026-10-19T10:00:00Z" },
        },
      ],
    });
    fireEvent.click(screen.getByRole("radio", { name: "請假" }));
    expect(screen.getByLabelText("更正／補登原因")).toBeRequired();
    fireEvent.click(screen.getByRole("radio", { name: "出席" }));
    expect(screen.getByRole("button", { name: "確認儲存（0 人）" })).toBeDisabled();
  });
  it("disables writes when SQL is missing or permission is readonly", () => {
    const { unmount } = show({ ...data, attendanceAvailable: false });
    expect(screen.getByText(/請先套用/)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")[0]).toBeDisabled();
    unmount();
    show({ ...data, canManageAttendance: false });
    expect(screen.getByText(/唯讀檢視/)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")[0]).toBeDisabled();
  });
  it("prevents duplicate submissions and dismissal while saving; uncertain outcome blocks retry", async () => {
    let reject!: (error: Error) => void;
    vi.mocked(saveClassAttendanceAction).mockReturnValue(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    show();
    fireEvent.click(screen.getAllByRole("radio", { name: "出席" })[0]);
    const submit = screen.getByRole("button", { name: "確認儲存（1 人）" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(saveClassAttendanceAction).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "取消" })).toBeDisabled();
    reject(new Error("network"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("無法確認儲存結果"));
    expect(screen.queryByRole("button", { name: /確認儲存/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新載入" }));
    expect(onReload).toHaveBeenCalledOnce();
  });
});
