import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassSessionDateNavigation } from "./class-session-date-navigation";

const navigation = vi.hoisted(() => ({ push: vi.fn(), isPending: false }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push }) }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useTransition: () => [navigation.isPending, (callback: () => void) => callback()],
}));

describe("class session automatic date navigation", () => {
  afterEach(cleanup);
  beforeEach(() => {
    navigation.push.mockReset();
    navigation.isPending = false;
  });
  const view = (date = "2026-10-10") => (
    <ClassSessionDateNavigation
      classId="class/a"
      date={date}
      actions={<button>完成今日課堂</button>}
    >
      <input aria-label="進度備註" />
      <button>儲存進度</button>
    </ClassSessionDateNavigation>
  );
  it("navigates immediately after selecting a date without a submit button", () => {
    render(view());
    fireEvent.change(screen.getByLabelText("課堂日期"), { target: { value: "2026-10-11" } });
    expect(navigation.push).toHaveBeenCalledWith("/classes/class%2Fa?date=2026-10-11", {
      scroll: false,
    });
    expect(screen.queryByRole("button", { name: "切換日期" })).not.toBeInTheDocument();
  });
  it("ignores a cleared or unchanged date", () => {
    render(view());
    const input = screen.getByLabelText("課堂日期");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.change(input, { target: { value: "2026-10-10" } });
    expect(navigation.push).not.toHaveBeenCalled();
  });
  it("shows loading and disables old classroom controls until navigation finishes", () => {
    navigation.isPending = true;
    const { rerender } = render(view());
    expect(screen.getByRole("status")).toHaveTextContent("正在載入課堂");
    expect(screen.getByRole("region", { name: "課堂日期與紀錄" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByLabelText("課堂日期")).toBeDisabled();
    expect(screen.getByLabelText("進度備註")).toBeDisabled();
    expect(screen.getByRole("button", { name: "完成今日課堂" })).toBeDisabled();
    navigation.isPending = false;
    rerender(view("2026-10-11"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByLabelText("課堂日期")).toHaveValue("2026-10-11");
    expect(screen.getByRole("button", { name: "儲存進度" })).toBeEnabled();
  });
});
