import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CurriculumDirectoryView } from "./curriculum-directory";
import { createTemplateAction } from "@/app/actions/curriculum-actions";
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
  afterEach(cleanup);
  it("collapses filters without clearing selections and exposes icon-only accessible controls", () => {
    render(<CurriculumDirectoryView data={base} canManage={false} query={{ gradeId: "g8" }} />);
    const control = screen.getByLabelText("展開或收合篩選條件");
    const details = control.closest("details")!;
    const grade = screen.getByLabelText("年級");
    const apply = screen.getByRole("button", { name: "套用篩選" });
    expect(apply).toHaveTextContent("套用篩選");
    expect(control.textContent).toBe("");
    fireEvent.click(control);
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(control);
    expect(details).toHaveAttribute("open");
    expect(grade).toHaveValue("g8");
    expect(apply.closest("form")).toHaveAttribute("method", "get");
  });
  it("collapses and expands creation without submitting or clearing entered values", () => {
    render(<CurriculumDirectoryView data={base} canManage />);
    const input = screen.getByLabelText("範本名稱");
    fireEvent.change(input, { target: { value: "尚未儲存的教材" } });
    const summary = screen.getByText("建立新範本").closest("summary")!;
    expect(summary).toHaveAttribute("aria-label", "展開或收合建立新範本");
    expect(summary).not.toHaveTextContent(/展開|收合/);
    const details = summary.closest("details")!;
    expect(details).toHaveAttribute("open");
    fireEvent.click(summary);
    expect(details).not.toHaveAttribute("open");
    expect(input).toHaveValue("尚未儲存的教材");
    expect(createTemplateAction).not.toHaveBeenCalled();
    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
    expect(input).toHaveValue("尚未儲存的教材");
  });
  it("shows status tabs, URL filters and an empty state", () => {
    render(<CurriculumDirectoryView data={base} query={{ gradeId: "g8" }} canManage={false} />);
    expect(screen.queryByText("開發階段資料")).not.toBeInTheDocument();
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
  it("marks only explicit Mock data as process-local", () => {
    render(<CurriculumDirectoryView data={base} canManage={false} isMock />);
    expect(screen.getByText("開發階段資料")).toBeInTheDocument();
  });
});
