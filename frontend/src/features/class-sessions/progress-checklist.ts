import type { ClassSessionMemberView, DailyProgressEntryInput } from "./class-session.types";

export function buildCheckedProgressEntries(
  member: ClassSessionMemberView,
  selectedIds: ReadonlySet<string>,
  note: string,
): DailyProgressEntryInput[] {
  return member.plans.flatMap((plan) =>
    plan.items
      .filter((item) => selectedIds.has(item.id) && item.status !== "completed")
      .map((item) => ({
        sessionMemberId: member.id,
        studentId: member.studentId,
        studyPlanId: plan.id,
        learningItemId: item.id,
        learningItemRevision: item.revision,
        status: "completed" as const,
        note: note.trim(),
      })),
  );
}
