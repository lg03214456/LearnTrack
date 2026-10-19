import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CurriculumTemplateView } from "../curriculum.types";
import { CurriculumTemplateActions } from "./curriculum-template-actions";
import { CurriculumTemplateCard } from "./curriculum-template-card";
import {
  readTemplateEditorAction,
  updateTemplateStateAction,
  archiveTemplateAction,
} from "@/app/actions/curriculum-actions";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/actions/curriculum-actions", () => ({
  copyVersionAction: vi.fn(),
  readTemplateEditorAction: vi.fn(),
  updateTemplateStateAction: vi.fn(),
  archiveTemplateAction: vi.fn(),
}));
const row: CurriculumTemplateView = {
  id: "tpl-test",
  name: "測試教材",
  grade: "國一",
  subject: "數學",
  publisher: "自編",
  isArchived: false,
  versions: [{ id: "published", number: 1, status: "published", revision: 3, itemCount: 1 }],
};
const editor = {
  templateId: row.id,
  name: row.name,
  gradeId: "g7",
  subjectId: "math",
  publisherId: "custom",
  revision: 2,
  canEditClassification: false,
  dimensions: {
    grades: [{ id: "g7", name: "國一" }],
    subjects: [{ id: "math", name: "數學" }],
    publishers: [{ id: "custom", name: "自編" }],
  },
};

describe("curriculum card editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
    vi.mocked(readTemplateEditorAction).mockResolvedValue({ editor });
  });
  afterEach(cleanup);
  it("opens metadata with locked classification and preserves hidden identifiers", async () => {
    render(<CurriculumTemplateActions row={row} />);
    fireEvent.click(screen.getByText("編輯基本資料"));
    await screen.findByLabelText("教材名稱");
    expect(screen.getByRole("dialog", { name: "編輯教材基本資料" })).toBeInTheDocument();
    expect(screen.getByLabelText("年級")).toBeDisabled();
    expect(screen.getByLabelText("科目")).toBeDisabled();
    expect(screen.getByLabelText("出版社")).toBeEnabled();
    expect(screen.getByRole("dialog").querySelector('[name="revision"]')).toHaveValue("2");
    expect(readTemplateEditorAction).toHaveBeenCalledWith(row.id);
  });
  it("uses the newest draft without making a new copy", () => {
    render(
      <CurriculumTemplateActions
        row={{
          ...row,
          versions: [
            ...row.versions,
            { id: "draft-2", number: 2, status: "draft", revision: 1, itemCount: 1 },
            { id: "draft-3", number: 3, status: "draft", revision: 1, itemCount: 1 },
          ],
        }}
      />,
    );
    expect(screen.getByText("編輯內容")).toHaveAttribute("href", "/curriculum/templates/draft-3");
  });
  it("confirms copying published content without silently writing", () => {
    render(<CurriculumTemplateActions row={row} />);
    fireEvent.click(screen.getByText("編輯內容"));
    expect(screen.getByRole("dialog", { name: "建立內容草稿" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "複製並編輯內容" })).toBeInTheDocument();
    expect(screen.getByText(/學生現有修課計畫與進度不受影響/)).toBeInTheDocument();
  });
  it("shows load failure and supports retry", async () => {
    vi.mocked(readTemplateEditorAction).mockResolvedValueOnce({ message: "教材編輯資料無法載入" });
    render(<CurriculumTemplateActions row={row} />);
    fireEvent.click(screen.getByText("編輯基本資料"));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "重新載入" }));
    await screen.findByLabelText("教材名稱");
  });
  it("opens whole-template deletion without silently writing and cancels safely", () => {
    render(<CurriculumTemplateActions row={row} />);
    fireEvent.click(screen.getByText("刪除教材"));
    expect(screen.getByRole("dialog", { name: "刪除整份教材" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "確認刪除教材" })).toBeInTheDocument();
    expect(archiveTemplateAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(archiveTemplateAction).not.toHaveBeenCalled();
  });
  it("closes and refreshes only after a successful save", async () => {
    vi.mocked(updateTemplateStateAction).mockResolvedValue({
      ok: true,
      code: "OK",
      message: "已儲存",
    });
    render(<CurriculumTemplateActions row={row} />);
    fireEvent.click(screen.getByText("編輯基本資料"));
    const input = await screen.findByLabelText("教材名稱");
    fireEvent.change(input, { target: { value: "新名稱" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("does not expose mutation menus to read-only users or archived templates", () => {
    const { rerender } = render(<CurriculumTemplateCard row={row} />);
    expect(screen.queryByLabelText(/更多操作/)).not.toBeInTheDocument();
    rerender(<CurriculumTemplateCard row={{ ...row, isArchived: true }} canManage />);
    expect(screen.queryByLabelText(/更多操作/)).not.toBeInTheDocument();
  });
  it("keeps failed saves in the dialog and does not refresh", async () => {
    vi.mocked(updateTemplateStateAction).mockResolvedValue({
      ok: false,
      code: "CONFLICT",
      message: "資料已更新",
    });
    render(<CurriculumTemplateActions row={row} />);
    fireEvent.click(screen.getByText("編輯基本資料"));
    const input = await screen.findByLabelText("教材名稱");
    fireEvent.submit(input.closest("form")!);
    await screen.findByText("資料已更新");
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
