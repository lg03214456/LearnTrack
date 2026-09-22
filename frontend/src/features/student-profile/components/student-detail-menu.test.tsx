import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StudentDetailMenu } from "./student-detail-menu";

afterEach(cleanup);

describe("StudentDetailMenu", () => {
  it("marks the selected section and preserves the class return context", () => {
    render(
      <StudentDetailMenu
        activeSection="assessments"
        studentId="stu-1"
        classId="cls-1"
        canViewPlans
      />,
    );
    expect(screen.getByRole("link", { name: /考試紀錄/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /修課進度/ })).toHaveAttribute(
      "href",
      "/students/stu-1?tab=plans&classId=cls-1",
    );
  });

  it("does not expose study plans without read permission", () => {
    render(<StudentDetailMenu activeSection="overview" studentId="stu-1" canViewPlans={false} />);
    expect(screen.queryByRole("link", { name: /修課進度/ })).not.toBeInTheDocument();
  });
});
