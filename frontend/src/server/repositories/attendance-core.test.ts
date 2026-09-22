import { describe, expect, it } from "vitest";
import { buildAttendanceDayView } from "./attendance-core";

const expected = [
  {
    classId: "cls-1",
    className: "數學班",
    schedules: [],
    students: [{ studentId: "stu-1", name: "小明", number: "S1" }],
  },
  {
    classId: "cls-2",
    className: "英文班",
    schedules: [],
    students: [
      { studentId: "stu-1", name: "小明", number: "S1" },
      { studentId: "stu-2", name: "小華", number: "S2" },
    ],
  },
];

describe("attendance day view", () => {
  it("deduplicates students across scheduled classes and joins existing status", () => {
    const view = buildAttendanceDayView(expected, [
      { studentId: "stu-1", name: "小明", number: "S1", status: "late", note: "遲到" },
    ]);
    expect(view.rows).toHaveLength(2);
    expect(view.rows[0]).toMatchObject({ studentId: "stu-1", status: "late", note: "遲到" });
    expect(view.rows[1]).toMatchObject({ studentId: "stu-2", status: "present" });
  });

  it("filters by class while preserving all class options", () => {
    const view = buildAttendanceDayView(expected, [], "cls-2");
    expect(view.rows.map((row) => row.studentId)).toEqual(["stu-1", "stu-2"]);
    expect(view.classOptions).toHaveLength(2);
  });
});
