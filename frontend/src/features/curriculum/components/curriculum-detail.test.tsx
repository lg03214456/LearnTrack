import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CurriculumDetail } from "../curriculum.types";
import { CurriculumDetailView } from "./curriculum-detail";
import { resolvePersistedOrder } from "./curriculum-sortable-list";

vi.mock("@/app/actions/curriculum-actions", () => ({
  addTemplateItemStateAction: vi.fn(),
  deleteTemplateItemAction: vi.fn(),
  moveTemplateItemAction: vi.fn(),
  publishVersionAction: vi.fn(),
  copyVersionAction: vi.fn(),
  archiveTemplateAction: vi.fn(),
  reorderTemplateItemsAction: vi.fn(),
  updateTemplateItemStateAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(cleanup);
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

const detail: CurriculumDetail = {
  template: {
    id: "tpl",
    name: "國二數學",
    grade: "國二",
    subject: "數學",
    publisher: "翰林",
    isArchived: false,
    versions: [],
  },
  versionId: "draft-v",
  versionNumber: 2,
  status: "draft",
  revision: 3,
  items: [
    { id: "a", type: "unit", title: "單元一　乘法公式", position: 0 },
    { id: "b", parentId: "a", type: "chapter", title: "1-1 平方差公式", position: 1 },
  ],
};

describe("CurriculumDetailView", () => {
  it("shows add, move boundaries, and delete confirmation for editable drafts", () => {
    render(<CurriculumDetailView data={detail} canManage />);
    fireEvent.click(screen.getByRole("button", { name: "新增內容" }));
    expect(screen.getByLabelText("項目類型")).toBeInTheDocument();
    expect(screen.getByLabelText("所屬單元")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("項目類型"), { target: { value: "chapter" } });
    expect(screen.getByLabelText("所屬單元")).toBeEnabled();
    expect(screen.getByRole("option", { name: "單元一　乘法公式" })).toBeInTheDocument();
    expect(screen.getByLabelText("教材層級說明")).toHaveTextContent("單元包含章節／教材內容");
    expect(
      screen.getByRole("button", { name: "拖曳「單元一　乘法公式」調整順序" }),
    ).toBeInTheDocument();
    expect(screen.getByText("單元大綱")).toBeInTheDocument();
    expect(screen.getByText("1-1 平方差公式").closest("li")).toHaveAttribute(
      "data-level",
      "content",
    );
    expect(screen.queryByRole("button", { name: /上移|下移/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刪除「單元一　乘法公式」" }));
    expect(
      screen.getByRole("dialog", { name: "確認刪除「單元一　乘法公式」" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByText(/以下 1 個子項目也會一併刪除/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("button", { name: "確認刪除" })).not.toBeInTheDocument();
  });

  it("keeps published and read-only views free of mutation controls", () => {
    const { rerender } = render(
      <CurriculumDetailView data={{ ...detail, status: "published" }} canManage />,
    );
    expect(screen.queryByRole("button", { name: "新增項目" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "複製為新草稿" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /刪除「/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刪除教材" })).toBeInTheDocument();
    rerender(<CurriculumDetailView data={detail} canManage={false} />);
    expect(screen.queryByRole("button", { name: "複製為新草稿" })).not.toBeInTheDocument();
    expect(screen.getAllByText(/單元一.*乘法公式/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /拖曳|上移|下移|刪除/ })).not.toBeInTheDocument();
  });
  it("restores repository order after persistence failure", () => {
    const previous = [detail.items[0], detail.items[1]];
    const next = [detail.items[1], detail.items[0]];
    expect(resolvePersistedOrder({ ok: false }, next, previous)).toEqual(previous);
    expect(resolvePersistedOrder({ ok: true }, next, previous)).toEqual(next);
  });
  it("confirms whole-template deletion and keeps archived content read-only", () => {
    const { rerender } = render(<CurriculumDetailView data={detail} canManage />);
    fireEvent.click(screen.getByRole("button", { name: "刪除教材" }));
    expect(screen.getByRole("dialog", { name: "刪除整份教材" })).toBeInTheDocument();
    expect(screen.getByText(/學生完成進度仍會保留/)).toBeInTheDocument();
    expect(screen.getByRole("dialog").querySelector('[name="templateId"]')).toHaveValue("tpl");
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    rerender(
      <CurriculumDetailView
        data={{ ...detail, template: { ...detail.template, isArchived: true } }}
        canManage
      />,
    );
    expect(screen.queryByRole("button", { name: /刪除|編輯|新增|複製/ })).not.toBeInTheDocument();
    expect(screen.getByText("已封存・唯讀")).toBeInTheDocument();
  });
  it("opens a draft item editor with title, type and parent selection", () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
    render(<CurriculumDetailView data={detail} canManage />);
    fireEvent.click(screen.getByRole("button", { name: "編輯「1-1 平方差公式」" }));
    expect(screen.getByRole("dialog", { name: "編輯教材內容" })).toBeInTheDocument();
    expect(screen.getByLabelText("項目名稱")).toHaveValue("1-1 平方差公式");
    expect(screen.getByLabelText("項目類型")).toHaveValue("chapter");
    expect(screen.getByLabelText("所屬單元")).toHaveValue("a");
  });
  it("keeps editing and deleting mutually exclusive across items", () => {
    render(<CurriculumDetailView data={detail} canManage />);
    fireEvent.click(screen.getByRole("button", { name: "刪除「單元一　乘法公式」" }));
    expect(screen.getByRole("button", { name: "編輯「1-1 平方差公式」" })).toBeDisabled();
    expect(screen.queryByRole("dialog", { name: "編輯教材內容" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    fireEvent.click(screen.getByRole("button", { name: "編輯「1-1 平方差公式」" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "確認刪除" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刪除「單元一　乘法公式」" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "關閉編輯教材內容" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刪除「單元一　乘法公式」" })).toBeEnabled();
  });
});
