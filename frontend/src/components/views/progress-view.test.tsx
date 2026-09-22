import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressView } from "./progress-view";
import { progressRows } from "@/server/data/mock/fixtures";
describe("progress filters", () => {
  it("shows and clears empty search", () => {
    render(<ProgressView rows={progressRows} />);
    fireEvent.change(screen.getByLabelText("搜尋學生"), { target: { value: "不存在" } });
    expect(screen.getByText("找不到符合條件的學生")).toBeInTheDocument();
    fireEvent.click(screen.getByText("清除篩選"));
    expect(screen.getByText("陳品妤")).toBeInTheDocument();
  });
});
