import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CurriculumDetail } from "../curriculum.types";
import { CurriculumDetailView } from "./curriculum-detail";
import { resolvePersistedOrder } from "./curriculum-sortable-list";

vi.mock("@/app/actions/curriculum-actions", () => ({
  addTemplateItemStateAction: vi.fn(),
  deleteTemplateItemAction: vi.fn(),
  moveTemplateItemAction: vi.fn(),
  publishVersionAction: vi.fn(),
  reorderTemplateItemsAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(cleanup);

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
    expect(screen.getByRole("group", { name: "確認刪除「單元一　乘法公式」" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("button", { name: "確認刪除" })).not.toBeInTheDocument();
  });

  it("keeps published and read-only views free of mutation controls", () => {
    const { rerender } = render(
      <CurriculumDetailView data={{ ...detail, status: "published" }} canManage />,
    );
    expect(screen.queryByRole("button", { name: "新增項目" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /刪除/ })).not.toBeInTheDocument();
    rerender(<CurriculumDetailView data={detail} canManage={false} />);
    expect(screen.getAllByText(/單元一.*乘法公式/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /拖曳|上移|下移|刪除/ })).not.toBeInTheDocument();
  });
  it("restores repository order after persistence failure", () => {
    const previous = [detail.items[0], detail.items[1]];
    const next = [detail.items[1], detail.items[0]];
    expect(resolvePersistedOrder({ ok: false }, next, previous)).toEqual(previous);
    expect(resolvePersistedOrder({ ok: true }, next, previous)).toEqual(next);
  });
});
