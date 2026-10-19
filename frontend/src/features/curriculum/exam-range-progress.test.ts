import { describe, expect, it } from "vitest";
import {
  buildExamRangeView,
  expandExamRangeSelection,
  normalizeExamRangeCommand,
} from "./exam-range-progress";
import type { ExamRangeItem, ExamRangeRecord, SaveExamRangeCommand } from "./exam-range.types";

const item = (id: string, status: ExamRangeItem["status"] = "pending"): ExamRangeItem => ({
  id,
  planId: "plan",
  planLabel: "教材 v1",
  planStatus: "active",
  title: id,
  type: "chapter",
  status,
});
const range: ExamRangeRecord = {
  id: "range",
  studentId: "student",
  organizationId: "org",
  name: "第一次段考",
  examDate: null,
  revision: 1,
  itemIds: ["a", "b"],
};
const command: SaveExamRangeCommand = {
  studentId: "student",
  rangeId: null,
  revision: 0,
  name: "  第一次段考  ",
  examDate: null,
  itemIds: ["a"],
};
describe("exam range rules", () => {
  it("does not invent completion for an empty range", () => {
    expect(buildExamRangeView({ ...range, itemIds: [] }, [])).toMatchObject({
      total: 0,
      completed: 0,
      percentage: 0,
    });
  });
  it("calculates 6/10 without depending on notes or numeric scores", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      ...item(String(i), i < 6 ? "completed" : "pending"),
      note: "已完成",
      score: 100,
    }));
    expect(
      buildExamRangeView({ ...range, itemIds: items.map((row) => row.id) }, items),
    ).toMatchObject({ completed: 6, total: 10, percentage: 60 });
  });
  it("expands units and deduplicates descendants and directly selected items", () => {
    const items = [
      { ...item("unit"), type: "unit" as const },
      { ...item("a"), parentId: "unit" },
      { ...item("b"), parentId: "unit" },
    ];
    expect(expandExamRangeSelection(["unit", "a"], items)).toEqual(["a", "b"]);
  });
  it("does not expand to another plan and rejects empty units", () => {
    expect(() =>
      expandExamRangeSelection(
        ["u"],
        [
          { ...item("u"), type: "unit" },
          { ...item("foreign"), planId: "other", parentId: "u" },
        ],
      ),
    ).toThrow("EMPTY_UNIT");
  });
  it("counts skipped, removed and missing historical selections without inflating percentages", () => {
    const view = buildExamRangeView({ ...range, itemIds: ["a", "b", "c", "missing", "a"] }, [
      item("a", "completed"),
      item("b", "skipped"),
      item("c", "removed"),
    ]);
    expect(view).toMatchObject({ completed: 1, total: 4, percentage: 25, needsReview: true });
  });
  it("flags replaced plans and never remaps old references to new versions", () => {
    const view = buildExamRangeView(range, [
      { ...item("a", "completed"), planStatus: "replaced" },
      { ...item("b"), planStatus: "replaced" },
      { ...item("new", "completed"), planLabel: "教材 v2" },
    ]);
    expect(view).toMatchObject({
      percentage: 50,
      needsReview: true,
      itemIds: ["a", "b"],
      materialLabels: ["教材 v1"],
    });
  });
  it("allows custom content, normalizes names and optional date", () => {
    expect(normalizeExamRangeCommand(command, { ranges: [], items: [item("a")] })).toMatchObject({
      name: "第一次段考",
      examDate: null,
      itemIds: ["a"],
    });
  });
  it.each(["2026-02-30", "invalid", "0000-01-01", "2026-13-01"])(
    "rejects invalid date %s",
    (examDate) => {
      expect(() =>
        normalizeExamRangeCommand({ ...command, examDate }, { ranges: [], items: [item("a")] }),
      ).toThrow("INVALID_DATE");
    },
  );
  it("rejects empty, unknown and newly selected historical items", () => {
    for (const itemIds of [[], ["missing"], ["b"]])
      expect(() =>
        normalizeExamRangeCommand(
          { ...command, itemIds },
          { ranges: [], items: [item("a"), { ...item("b"), planStatus: "replaced" }] },
        ),
      ).toThrow();
  });
  it("allows retaining old selections when editing and detects stale/foreign ranges", () => {
    const workspace = {
      ranges: [range],
      items: [{ ...item("a"), planStatus: "replaced" as const }, item("b")],
    };
    expect(
      normalizeExamRangeCommand({ ...command, rangeId: "range", revision: 1 }, workspace).itemIds,
    ).toEqual(["a"]);
    expect(() =>
      normalizeExamRangeCommand({ ...command, rangeId: "range", revision: 2 }, workspace),
    ).toThrow("CONFLICT");
    expect(() =>
      normalizeExamRangeCommand(
        { ...command, studentId: "other", rangeId: "range", revision: 1 },
        workspace,
      ),
    ).toThrow("NOT_FOUND");
  });
});
