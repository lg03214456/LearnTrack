import { describe, expect, it } from "vitest";
import { buildAssessmentCsv, buildSessionCsv } from "./student-report-export";

describe("student report CSV", () => {
  it("exports session progress and protects comma-containing values", () => {
    const csv = buildSessionCsv("陳同學", [
      {
        id: "session-1",
        date: "2026-08-24",
        classId: "cls-1",
        className: "數學 A 班",
        subject: "數學",
        attendance: "present",
        content: "應用題",
        progress: "完成 p.42–48, 訂正例題",
        score: 90,
        comment: "穩定",
      },
    ]);
    expect(csv).toContain("學生,日期,班級");
    expect(csv).toContain('"完成 p.42–48, 訂正例題"');
    expect(csv).toContain("出席");
  });

  it("exports assessment scores and percentages", () => {
    const csv = buildAssessmentCsv("陳同學", [
      {
        id: "result-1",
        assessmentId: "exam-1",
        title: "單元小考",
        termId: "115-1",
        subject: "數學",
        date: "2026-08-19",
        score: 46,
        maximumScore: 50,
        percentage: 92,
        comment: "表現良好",
        revision: 1,
        updatedAt: "2026-08-19T12:00:00Z",
      },
    ]);
    expect(csv).toContain("考卷名稱,得分,滿分,換算百分比");
    expect(csv).toContain("單元小考,46,50,92%");
  });
});
