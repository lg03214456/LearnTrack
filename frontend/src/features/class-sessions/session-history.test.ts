import { describe, expect, it } from "vitest";
import type { ClassDailyWorkspace, ClassSessionProgressView } from "./class-session.types";
import { groupSessionHistory } from "./session-history";
import { arrivalTimeInTaipei, classRecordTime, isClassAttendanceCommand } from "./class-attendance";

const row = (
  id: string,
  position: number,
  time: string,
  plan = "p1",
): ClassSessionProgressView => ({
  id,
  studentId: "s1",
  studentName: "學生甲",
  studyPlanId: plan,
  versionId: plan,
  versionLabel: plan,
  planLabel: "同名教材",
  learningItemId: `item-${position}`,
  itemPosition: position,
  learningItemTitle: `第${position}項`,
  statusAfterSession: "completed",
  recordedBy: "teacher",
  recordedAt: time,
  revision: 1,
});
describe("original-order class history", () => {
  it("groups stable students/plans and ignores timestamps, retaining predecessor before successor", () => {
    const original = row("z-original", 1, "2026-10-19T12:45:00Z");
    const correction = {
      ...original,
      id: "a-correction",
      supersedesId: original.id,
      recordedAt: "2026-10-19T13:00:00Z",
    };
    const data = {
      members: [{ studentId: "s1" }],
      history: [
        row("third", 3, "2026-10-19T11:00:00Z"),
        correction,
        row("second", 2, "2026-10-19T10:00:00Z"),
        row("another-version", 1, "2026-10-19T08:00:00Z", "p2"),
        original,
        {
          ...row("another-student", 1, "2026-10-19T14:00:00Z"),
          studentId: "s2",
          studentName: "學生甲",
        },
      ],
    } as ClassDailyWorkspace;
    const groups = groupSessionHistory(data);
    expect(groups.map((group) => group.studentId)).toEqual(["s1", "s2"]);
    expect(groups[0].plans).toHaveLength(2);
    expect(groups[0].plans[0].entries.map((entry) => entry.id)).toEqual([
      "z-original",
      "a-correction",
      "second",
      "third",
    ]);
    expect(data.history[0].id).toBe("third");
  });
  it("does not fabricate missing plan/position or merge same-named unknown versions", () => {
    const entry = { ...row("a", 1, "invalid"), studyPlanId: undefined, itemPosition: undefined };
    const result = groupSessionHistory({
      members: [],
      history: [entry, { ...entry, id: "b" }],
    } as unknown as ClassDailyWorkspace);
    expect(result[0].plans).toHaveLength(2);
    expect(result[0].plans[0].entries[0].itemPosition).toBeUndefined();
    expect(classRecordTime("invalid")).toBe("時間未提供");
  });
  it("converts actual arrival independently in Taipei time", () => {
    expect(arrivalTimeInTaipei("2026-10-19T10:42:00Z")).toBe("18:42");
    expect(arrivalTimeInTaipei(undefined)).toBe("");
  });
});

describe("attendance command validation", () => {
  const command = {
    sessionId: "lesson",
    sessionRevision: 1,
    reason: "",
    entries: [
      { sessionMemberId: "member", studentId: "student", status: "late", arrivalTime: "18:42" },
    ],
  };
  it("accepts optional valid late times", () => {
    expect(isClassAttendanceCommand(command)).toBe(true);
    expect(
      isClassAttendanceCommand({
        ...command,
        entries: [{ ...command.entries[0], arrivalTime: "" }],
      }),
    ).toBe(true);
  });
  it.each([
    null,
    {},
    { ...command, entries: [null] },
    { ...command, sessionRevision: 0 },
    { ...command, entries: [] },
    { ...command, entries: [...command.entries, ...command.entries] },
    { ...command, reason: "x".repeat(201) },
    ...["24:00", "12:60", "bad"].map((arrivalTime) => ({
      ...command,
      entries: [{ ...command.entries[0], arrivalTime }],
    })),
    { ...command, entries: [{ ...command.entries[0], status: "rescheduled" }] },
    { ...command, entries: [{ ...command.entries[0], status: "present" }] },
  ])("rejects malformed, duplicate or unsupported input %#", (value) => {
    expect(isClassAttendanceCommand(value)).toBe(false);
  });
});
