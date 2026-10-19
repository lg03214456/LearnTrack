import type {
  ExamRangeItem,
  ExamRangeRecord,
  ExamRangeView,
  ExamRangeWorkspace,
  SaveExamRangeCommand,
} from "./exam-range.types";

export function isExamRangeItemSelectable(item: ExamRangeItem) {
  return item.planStatus === "active" && item.status !== "removed";
}

export function expandExamRangeSelection(ids: string[], items: ExamRangeItem[]): string[] {
  const selected = new Set<string>();
  const visit = (id: string, ancestors = new Set<string>()) => {
    const item = items.find((row) => row.id === id);
    if (!item || ancestors.has(id)) throw new Error("INVALID_SELECTION");
    if (item.type !== "unit") {
      selected.add(id);
      return;
    }
    const children = items.filter((row) => row.parentId === id && row.planId === item.planId);
    if (!children.length) throw new Error("EMPTY_UNIT");
    const next = new Set([...ancestors, id]);
    children.forEach((child) => visit(child.id, next));
  };
  ids.forEach((id) => visit(id));
  return [...selected];
}

export function buildExamRangeView(range: ExamRangeRecord, items: ExamRangeItem[]): ExamRangeView {
  const ids = [...new Set(range.itemIds)];
  const selected = ids.map((id) => items.find((item) => item.id === id));
  const completed = selected.filter((item) => item?.status === "completed").length;
  return {
    ...range,
    itemIds: ids,
    completed,
    total: ids.length,
    percentage: ids.length ? Math.round((completed / ids.length) * 100) : 0,
    needsReview: selected.some(
      (item) =>
        !item ||
        item.planStatus === "replaced" ||
        item.planStatus === "archived" ||
        item.status === "removed",
    ),
    materialLabels: [...new Set(selected.flatMap((item) => (item ? [item.planLabel] : [])))],
  };
}

export function normalizeExamRangeCommand(
  command: SaveExamRangeCommand,
  workspace: ExamRangeWorkspace,
): SaveExamRangeCommand {
  const name = typeof command.name === "string" ? command.name.trim() : "";
  if (
    !command.studentId ||
    !name ||
    name.length > 100 ||
    !Number.isInteger(command.revision) ||
    (command.rangeId ? command.revision < 1 : command.revision !== 0)
  )
    throw new Error("INVALID_INPUT");
  if (command.examDate) {
    const date = new Date(command.examDate + "T00:00:00Z");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(command.examDate) ||
      Number(command.examDate.slice(0, 4)) < 1 ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== command.examDate
    )
      throw new Error("INVALID_DATE");
  }
  if (
    !Array.isArray(command.itemIds) ||
    command.itemIds.length > 500 ||
    command.itemIds.some((id) => typeof id !== "string")
  )
    throw new Error("INVALID_SELECTION");
  const previous = command.rangeId
    ? workspace.ranges.find(
        (range) => range.id === command.rangeId && range.studentId === command.studentId,
      )
    : undefined;
  if (command.rangeId && !previous) throw new Error("NOT_FOUND");
  if (previous && previous.revision !== command.revision) throw new Error("CONFLICT");
  const itemIds = expandExamRangeSelection(command.itemIds, workspace.items);
  if (
    !itemIds.length ||
    itemIds.length > 500 ||
    itemIds.some((id) => {
      const item = workspace.items.find((row) => row.id === id)!;
      return !isExamRangeItemSelectable(item) && !previous?.itemIds.includes(id);
    })
  )
    throw new Error("INVALID_SELECTION");
  return { ...command, name, examDate: command.examDate || null, itemIds };
}
