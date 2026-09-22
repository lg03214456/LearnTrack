import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ListStudentsQuery, StudentListResult } from "../student-roster.types";
import { StudentsView } from "./students-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/actions/student-roster-actions", () => ({
  saveStudentRosterStateAction: vi.fn(),
  changeStudentLifecycleStateAction: vi.fn(),
}));
afterEach(cleanup);
const query: ListStudentsQuery = { organizationId: "org-001", page: 1, pageSize: 20 };
const ready: StudentListResult = {
  state: "ready",
  rows: [
    {
      id: "stu-1",
      organizationId: "org-001",
      number: "S1",
      name: "陳同學",
      gender: "女",
      phone: "0900",
      status: "active",
      classes: [
        { classId: "c1", className: "數學班" },
        { classId: "c2", className: "英文班" },
      ],
    },
  ],
  classOptions: [
    { id: "c1", name: "數學班" },
    { id: "c2", name: "英文班" },
  ],
  selectedClass: { id: "c1", name: "數學班", capacity: 20 },
  summary: {
    totalStudents: 1,
    activeStudents: 1,
    leaveStudents: 0,
    archivedStudents: 0,
    contextTotal: 20,
  },
  pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
};

describe("students view", () => {
  it("shows selected context without a standalone clear control and preserves class context in student links", () => {
    render(<StudentsView result={ready} query={{ ...query, classId: "c1" }} />);
    expect(screen.getByText("目前顯示：")).toBeInTheDocument();
    expect(screen.getByText("班級學生數")).toBeInTheDocument();
    expect(screen.getAllByText("英文班").length).toBeGreaterThan(1);
    expect(screen.getByRole("link", { name: /陳同學/ })).toHaveAttribute(
      "href",
      "/students/stu-1?classId=c1",
    );
    expect(screen.queryByText("清除篩選")).not.toBeInTheDocument();
  });
  it("shows a neutral unavailable state without class details", () => {
    render(
      <StudentsView
        result={{ ...ready, state: "unavailable-class", rows: [], selectedClass: undefined }}
        query={{ ...query, classId: "secret" }}
      />,
    );
    expect(screen.getByText("無法使用這個班級篩選")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });
  it("distinguishes an available empty result without a standalone clear link", () => {
    render(
      <StudentsView
        result={{ ...ready, rows: [], pagination: { ...ready.pagination, total: 0 } }}
        query={{ ...query, classId: "c1", search: "none" }}
      />,
    );
    expect(screen.getByText("這個篩選條件目前沒有學生")).toBeInTheDocument();
    expect(screen.queryByText("無法使用這個班級篩選")).not.toBeInTheDocument();
    expect(screen.queryByText("清除搜尋與狀態")).not.toBeInTheDocument();
  });
  it("shows create and per-student settings only to roster managers", () => {
    render(<StudentsView result={ready} query={query} canManageStudents canManageClasses />);

    expect(screen.getByRole("button", { name: "新增學生" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "封存學生陳同學" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "設定陳同學" }));
    expect(screen.getByRole("dialog", { name: "管理學生主檔" })).toBeInTheDocument();
    expect(screen.getByText(/編輯 陳同學 的基本資料/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "所屬班級" })).toBeInTheDocument();
    expect(screen.queryByText("刪除學生")).not.toBeInTheDocument();
  });
});
