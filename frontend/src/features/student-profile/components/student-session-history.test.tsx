import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StudentSessionHistory } from "./student-session-history";

describe("StudentSessionHistory", () => {
  it("shows each class session with progress, attendance and score", () => {
    render(
      <StudentSessionHistory
        studentName="陳同學"
        sessions={[
          {
            id: "session-1",
            date: "2026-08-24",
            classId: "cls-1",
            className: "國中數學 A班",
            subject: "數學",
            attendance: "present",
            content: "應用題",
            progress: "完成 p.42–48",
            score: 90,
            comment: "表現穩定",
          },
        ]}
      />,
    );
    expect(screen.getByText("2026-08-24")).toBeInTheDocument();
    expect(screen.getByText("出席")).toBeInTheDocument();
    expect(screen.getByText("完成 p.42–48")).toBeInTheDocument();
    expect(screen.getByText("90 分")).toBeInTheDocument();
  });
});
