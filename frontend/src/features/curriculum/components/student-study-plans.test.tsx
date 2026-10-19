import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StudentStudyPlansView } from "./student-study-plans";
import type { StudentStudyPlanPage, StudyPlanView } from "../curriculum.types";
vi.mock("@/app/actions/curriculum-actions", () => ({
  createPlanAction: vi.fn(),
  updateLearningItemAction: vi.fn(),
}));
afterEach(cleanup);
it("keeps current plans editable and nonactive history collapsed and readonly without changing percentages", () => {
  const plan: StudyPlanView = {
    id: "active",
    term: "學期",
    subject: "數學",
    grade: "七",
    publisher: "測試",
    templateName: "教材",
    version: 1,
    status: "active",
    completed: 1,
    total: 2,
    percentage: 50,
    items: [
      {
        id: "a",
        title: "目前章節",
        type: "chapter",
        position: 1,
        status: "pending",
        isCustom: false,
      },
    ],
  };
  const data: StudentStudyPlanPage = {
    student: { id: "student", name: "測試", number: "STU-0001" },
    plans: [
      plan,
      {
        ...plan,
        id: "history",
        status: "replaced",
        percentage: 30,
        items: [{ ...plan.items[0], id: "b", title: "歷史章節" }],
      },
    ],
    terms: [],
    availableVersions: [],
  };
  const { container } = render(<StudentStudyPlansView data={data} canManage />);
  expect(screen.getByLabelText("目前章節狀態")).toBeInTheDocument();
  expect(screen.queryByLabelText("歷史章節狀態")).not.toBeInTheDocument();
  const history = container.querySelector("details")!;
  expect(history).not.toHaveAttribute("open");
  expect(history).toHaveTextContent("歷史／非使用中計畫（1）");
  expect(history).toHaveTextContent("已更換");
  expect(history).toHaveTextContent("30%");
  expect(screen.getByText("50%")).toBeInTheDocument();
  history.open = true;
  expect(history.querySelector("form")).toBeNull();
});
