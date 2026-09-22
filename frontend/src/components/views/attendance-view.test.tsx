import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttendanceView } from "./attendance-view";
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
describe("attendance", () => {
  beforeEach(() => push.mockReset());
  afterEach(cleanup);
  it("updates status totals", () => {
    render(
      <AttendanceView
        initial={[{ studentId: "1", name: "小明", number: "S1", status: "present", note: "" }]}
      />,
    );
    expect(screen.getByText("出席: 1")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("小明-缺席"));
    expect(screen.getByText("缺席: 1")).toBeInTheDocument();
  });
  it("keeps date and class filters in the URL", () => {
    render(
      <AttendanceView
        date="2026-08-31"
        classId="cls-1"
        classOptions={[{ id: "cls-1", name: "數學班" }]}
        initial={[]}
      />,
    );
    fireEvent.change(screen.getByLabelText("點名日期"), { target: { value: "2026-09-01" } });
    expect(push).toHaveBeenCalledWith("/attendance?date=2026-09-01&classId=cls-1");
  });
});
