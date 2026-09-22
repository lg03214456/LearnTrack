import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClassesView } from "./classes-view";
import type { ClassOverviewRow } from "../class-management.types";
vi.mock("@/app/actions/class-management-actions", () => ({ changeClassLifecycleAction: vi.fn() }));
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
describe("class overview", () => {
  afterEach(cleanup);
  it("links to the shared filtered roster and editor", () => {
    render(<ClassesView rows={[row]} canCreate />);
    expect(screen.getByLabelText("查看數學班學生名單")).toHaveAttribute(
      "href",
      "/students?classId=cls-1",
    );
    expect(screen.getByRole("link", { name: /編輯/ })).toHaveAttribute(
      "href",
      "/classes/cls-1/edit",
    );
    expect(screen.getByRole("link", { name: /新增班級/ })).toHaveAttribute("href", "/classes/new");
    expect(screen.getByLabelText("進入數學班今日課堂")).toHaveAttribute("href", "/classes/cls-1");
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
