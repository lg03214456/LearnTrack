import type { ClassDailyWorkspace, ClassSessionProgressView } from "./class-session.types";

export function groupSessionHistory(data: ClassDailyWorkspace) {
  const studentOrder = new Map(data.members.map((member, index) => [member.studentId, index]));
  const students = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      plans: Map<
        string,
        { id: string; label: string; versionLabel?: string; entries: ClassSessionProgressView[] }
      >;
    }
  >();
  const byId = new Map(data.history.map((entry) => [entry.id, entry]));
  const correctionDepth = (entry: ClassSessionProgressView) => {
    const seen = new Set<string>();
    let current = entry;
    while (current.supersedesId && !seen.has(current.id)) {
      seen.add(current.id);
      const previous = byId.get(current.supersedesId);
      if (!previous) break;
      current = previous;
    }
    return seen.size;
  };
  for (const entry of data.history) {
    let student = students.get(entry.studentId);
    if (!student) {
      student = { studentId: entry.studentId, studentName: entry.studentName, plans: new Map() };
      students.set(entry.studentId, student);
    }
    // Never merge unrelated historical versions merely because their names match.
    const planId = entry.studyPlanId
      ? `${entry.studyPlanId}:${entry.versionId ?? ""}`
      : `unknown:${entry.id}`;
    let plan = student.plans.get(planId);
    if (!plan) {
      plan = { id: planId, label: entry.planLabel, versionLabel: entry.versionLabel, entries: [] };
      student.plans.set(planId, plan);
    }
    plan.entries.push(entry);
  }
  return [...students.values()]
    .sort(
      (a, b) =>
        (studentOrder.get(a.studentId) ?? Infinity) - (studentOrder.get(b.studentId) ?? Infinity) ||
        a.studentId.localeCompare(b.studentId),
    )
    .map((student) => ({
      ...student,
      plans: [...student.plans.values()]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((plan) => ({
          ...plan,
          entries: plan.entries.sort(
            (a, b) =>
              (a.itemPosition ?? Infinity) - (b.itemPosition ?? Infinity) ||
              (a.learningItemId ?? a.id).localeCompare(b.learningItemId ?? b.id) ||
              correctionDepth(a) - correctionDepth(b) ||
              a.id.localeCompare(b.id),
          ),
        })),
    }));
}
