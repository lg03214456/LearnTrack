import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadClassCreateViewAction,
  loadClassEditViewAction,
} from "@/app/actions/class-management-actions";
import { ClassesView } from "./classes-view";
import type { ClassEditorView, ClassOverviewRow } from "../class-management.types";
vi.mock("@/app/actions/class-management-actions", () => ({
  changeClassLifecycleAction: vi.fn(),
  loadClassCreateViewAction: vi.fn(),
  loadClassEditViewAction: vi.fn(),
  saveClassStateAction: vi.fn(),
}));
const row: ClassOverviewRow = {
  id: "cls-1",
  name: "數學班",
  code: "M1",
  type: "progress",
  subjects: ["數學"],
  grades: ["國二"],
  allGrades: false,
  teacherName: "林老師",
  schedules: [{ weekday: 1, startTime: "18:30", endTime: "20:30", room: "201" }],
  studentCount: 3,
  capacity: 20,
  status: "active",
  progress: 50,
  revision: 1,
  capabilities: {
    canCreate: true,
    canEdit: true,
    canChangeTeacher: true,
    canChangeLifecycle: true,
  },
};
const createView: ClassEditorView = {
  mode: "create",
  initial: {
    name: "",
    code: "",
    type: "progress",
    subjectIds: [],
    gradeIds: [],
    allGrades: false,
    teacherId: "",
    capacity: null,
    status: "recruiting",
    schedules: [],
    studentIds: [],
  },
  teacherOptions: [],
  subjectOptions: [],
  gradeOptions: [],
  studentOptions: [],
  capabilities: row.capabilities,
};
describe("class overview", () => {
  afterEach(cleanup);
  it("links to the shared filtered roster and exposes the editor action", () => {
    render(<ClassesView rows={[row]} canCreate />);
    expect(screen.getByLabelText("查看數學班學生名單")).toHaveAttribute(
      "href",
      "/students?classId=cls-1",
    );
    expect(screen.getByRole("button", { name: "編輯" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增班級" })).toBeInTheDocument();
    expect(screen.getByLabelText("進入數學班今日課堂")).toHaveAttribute("href", "/classes/cls-1");
  });
  it("opens and closes the create editor in a dialog without navigating", async () => {
    vi.mocked(loadClassCreateViewAction).mockResolvedValue(createView);
    render(<ClassesView rows={[row]} canCreate />);

    fireEvent.click(screen.getByRole("button", { name: "新增班級" }));
    expect(await screen.findByRole("dialog", { name: "新增班級" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "關閉新增班級對話框" }));
    expect(screen.queryByRole("dialog", { name: "新增班級" })).not.toBeInTheDocument();
  });
  it("opens the existing class editor in the same dialog flow", async () => {
    vi.mocked(loadClassEditViewAction).mockResolvedValue({
      ...createView,
      mode: "edit",
      initial: { ...createView.initial, classId: "cls-1", revision: 1, code: "M1" },
    });
    render(<ClassesView rows={[row]} canCreate />);

    fireEvent.click(screen.getByRole("button", { name: "編輯" }));

    expect(await screen.findByRole("dialog", { name: "編輯班級" })).toBeInTheDocument();
    expect(loadClassEditViewAction).toHaveBeenCalledWith("cls-1");
  });
  it("filters immediately and renders an empty state", () => {
    render(<ClassesView rows={[row]} canCreate={false} />);
    fireEvent.change(screen.getByLabelText("搜尋班級"), { target: { value: "英文" } });
    expect(screen.getByText("沒有符合條件的班級")).toBeInTheDocument();
  });
  it("hides mutation actions for read-only cards", () => {
    render(
      <ClassesView
        rows={[
          {
            ...row,
            capabilities: {
              canCreate: false,
              canEdit: false,
              canChangeTeacher: false,
              canChangeLifecycle: false,
            },
          },
        ]}
        canCreate={false}
      />,
    );
    expect(screen.queryByRole("link", { name: /編輯/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "結業" })).not.toBeInTheDocument();
  });
});
