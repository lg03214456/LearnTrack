import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentFilters } from "./student-filters";

const { pushMock, replaceMock } = vi.hoisted(() => ({ pushMock: vi.fn(), replaceMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => new URLSearchParams("classId=c1&status=active&page=3"),
}));
afterEach(cleanup);

describe("URL-backed student filters", () => {
  it("changes class, preserves status, and resets page", () => {
    render(
      <StudentFilters
        query={{ organizationId: "org-1", classId: "c1", status: "active", page: 3, pageSize: 20 }}
        classOptions={[
          { id: "c1", name: "數學班" },
          { id: "c2", name: "英文班" },
        ]}
      />,
    );
    fireEvent.change(screen.getByLabelText("班級篩選"), { target: { value: "c2" } });
    expect(pushMock).toHaveBeenCalledWith("/students?classId=c2&status=active");
  });
  it("updates search after a debounce while preserving supported filters", async () => {
    replaceMock.mockClear();
    render(
      <StudentFilters
        query={{ organizationId: "org-1", classId: "c1", status: "active", page: 1, pageSize: 20 }}
        classOptions={[{ id: "c1", name: "數學班" }]}
      />,
    );
    fireEvent.change(screen.getByLabelText("搜尋學生"), { target: { value: "陳" } });
    await waitFor(
      () => expect(replaceMock).toHaveBeenCalledWith(expect.stringContaining("search=%E9%99%B3")),
      { timeout: 1000 },
    );
    expect(replaceMock).toHaveBeenCalledWith(expect.stringContaining("classId=c1"));
  });
  it("uses empty all options and renders no search or clear button", () => {
    render(
      <StudentFilters
        query={{ organizationId: "org-1", page: 1, pageSize: 20 }}
        classOptions={[{ id: "c1", name: "數學班" }]}
      />,
    );
    expect(screen.getByRole("option", { name: "全部班級" })).toHaveValue("");
    expect(screen.getByRole("option", { name: "在籍與停課" })).toHaveValue("");
    expect(screen.getByRole("option", { name: "已封存" })).toHaveValue("archived");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
