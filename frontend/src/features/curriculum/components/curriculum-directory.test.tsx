import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CurriculumDirectoryView } from "./curriculum-directory";
vi.mock("@/app/actions/curriculum-actions", () => ({ createTemplateAction: vi.fn() }));
const base = {
  rows: [],
  dimensions: {
    grades: [{ id: "g8", name: "國二" }],
    subjects: [{ id: "math", name: "數學" }],
    publishers: [{ id: "hanlin", name: "翰林" }],
  },
  summary: { total: 0, published: 0, draft: 0, archived: 0 },
};
describe("CurriculumDirectoryView", () => {
  it("shows status tabs, URL filters and an empty state", () => {
    render(<CurriculumDirectoryView data={base} query={{ gradeId: "g8" }} canManage={false} />);
    expect(screen.getByText("開發階段資料")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /全部教材/ })).toBeInTheDocument();
    expect(screen.getByLabelText("年級")).toHaveValue("g8");
    expect(screen.getByText(/沒有符合條件/)).toBeInTheDocument();
    expect(screen.queryByText("建立新範本")).not.toBeInTheDocument();
  });
  it("shows accessible create controls for managers", () => {
    render(<CurriculumDirectoryView data={base} canManage />);
    expect(screen.getByLabelText("範本名稱")).toBeInTheDocument();
    expect(screen.getByLabelText("建立範本年級")).toBeInTheDocument();
  });
});
