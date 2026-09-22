import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  StudentAssessmentHistory,
  StudentProfileHero,
  StudentProfileOverview,
} from "./student-profile-overview";

const detail = {
  profile: {
    id: "s1",
    number: "S1",
    name: "陳同學",
    gender: "女" as const,
    phone: "0900",
    school: "向學國中",
    grade: "國二",
    status: "active" as const,
    revision: 1,
    guardians: [{ id: "g1", name: "陳媽媽", relationship: "母親", phone: "0911" }],
    classes: [
      { id: "c1", name: "數學班" },
      { id: "c2", name: "英文班" },
    ],
  },
  sessions: [],
  assessment: {
    rows: [
      {
        id: "r1",
        assessmentId: "a1",
        title: "小考",
        termId: "115-1",
        subject: "數學",
        date: "2026-08-01",
        score: 45,
        maximumScore: 50,
        percentage: 90,
        comment: "很好",
        revision: 1,
        updatedAt: "now",
      },
    ],
    exportRows: [
      {
        id: "r1",
        assessmentId: "a1",
        title: "小考",
        termId: "115-1",
        subject: "數學",
        date: "2026-08-01",
        score: 45,
        maximumScore: 50,
        percentage: 90,
        comment: "很好",
        revision: 1,
        updatedAt: "now",
      },
    ],
    summary: {
      latestPercentage: 90,
      averagePercentage: 90,
      resultCount: 1,
      trend: [{ label: "08-01", percentage: 90 }],
    },
    terms: [{ id: "115-1", name: "115-1" }],
    subjects: ["數學"],
    availableAssessments: [],
    pagination: { page: 1, total: 1, totalPages: 1 },
  },
};

afterEach(cleanup);
describe("StudentProfileOverview", () => {
  it("shows the student identity and repository-derived summary", () => {
    render(<StudentProfileHero detail={detail} />);
    expect(screen.getByText("陳同學")).toBeInTheDocument();
    expect(screen.getByText("平均成績")).toBeInTheDocument();
    expect(screen.getAllByText("90%")).toHaveLength(2);
    expect(screen.getByText("1 筆")).toBeInTheDocument();
  });
  it("shows personal, guardian and multi-class information", () => {
    render(<StudentProfileOverview detail={detail} />);
    expect(screen.getByText("陳媽媽")).toBeInTheDocument();
    expect(screen.getByText("母親")).toBeInTheDocument();
    expect(screen.getByText("數學班")).toBeInTheDocument();
    expect(screen.getByText("英文班")).toBeInTheDocument();
    expect(screen.queryByText("45")).not.toBeInTheDocument();
  });
  it("shows assessment values in the dedicated section and preserves navigation context", () => {
    render(
      <StudentAssessmentHistory
        detail={detail}
        filters={{ page: 1, pageSize: 20 }}
        classId="cls-1"
      />,
    );
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByDisplayValue("cls-1")).toHaveAttribute("name", "classId");
  });
});
