import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PageHeader } from "./page-header";
afterEach(cleanup);
describe("PageHeader", () => {
  it("renders a deterministic linked tree on second-level pages", () => {
    render(
      <PageHeader
        eyebrow="教材 / 版本"
        title="版本內容"
        description="說明"
        breadcrumbs={[{ label: "教材範本", href: "/curriculum/templates" }, { label: "版本內容" }]}
      />,
    );
    expect(screen.getByRole("link", { name: "教材範本" })).toHaveAttribute(
      "href",
      "/curriculum/templates",
    );
  });
  it("does not add a back link to top-level pages", () => {
    const { container } = render(
      <PageHeader eyebrow="教材" title="教材範本庫" description="說明" />,
    );
    expect(container.querySelector("a")).toBeNull();
  });
  it("marks the final tree item as the current page", () => {
    render(
      <PageHeader
        eyebrow="教材範本 / 版本內容"
        title="國二數學"
        description="說明"
        breadcrumbs={[{ label: "教材範本", href: "/curriculum/templates" }, { label: "版本內容" }]}
      />,
    );
    const breadcrumbs = screen.getByRole("navigation", { name: "頁面路徑" });
    expect(breadcrumbs).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "教材範本" })).toHaveAttribute(
      "href",
      "/curriculum/templates",
    );
    expect(within(breadcrumbs).getByText("版本內容")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: /返回/ })).not.toBeInTheDocument();
  });
});
