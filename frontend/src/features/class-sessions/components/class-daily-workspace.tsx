"use client";

import { useActionState, useMemo, useState } from "react";
import { BookOpenCheck, CheckCircle2, Plus, Save, Trash2, UserRound } from "lucide-react";
import {
  appendCompletedProgressAction,
  correctDailyProgressAction,
  saveDailyProgressAction,
} from "@/app/actions/class-session-actions";
import type {
  ClassDailyWorkspace,
  DailyProgressCommandResult,
  DailyProgressEntryInput,
} from "../class-session.types";

const statusLabels = {
  pending: "尚未開始",
  in_progress: "學習中",
  completed: "已完成",
} as const;
const attendanceLabels = {
  pending: "待點名",
  present: "出席",
  late: "遲到",
  leave: "請假",
  absent: "缺席",
} as const;

type DraftEntry = DailyProgressEntryInput & { clientId: string };
const initialResult: DailyProgressCommandResult = { ok: true, code: "OK", message: "" };

function suggestedEntry(member: ClassDailyWorkspace["members"][number]): DraftEntry | undefined {
  if (["leave", "absent"].includes(member.attendanceStatus) || !member.plans.length) return;
  const plan = member.plans[0];
  const item =
    plan.items.find((candidate) => candidate.status === "in_progress") ??
    plan.items.find((candidate) => candidate.status === "pending") ??
    plan.items[0];
  if (!item) return;
  return {
    clientId: `${member.id}-${item.id}`,
    sessionMemberId: member.id,
    studentId: member.studentId,
    studyPlanId: plan.id,
    learningItemId: item.id,
    learningItemRevision: item.revision,
    status: item.status === "skipped" ? "pending" : item.status,
    note: "",
  };
}

export function ClassDailyWorkspaceView({ data }: { data: ClassDailyWorkspace }) {
  const [entries, setEntries] = useState<DraftEntry[]>(() =>
    data.session.status === "draft"
      ? data.members.map(suggestedEntry).filter((entry): entry is DraftEntry => Boolean(entry))
      : [],
  );
  const isCompleted = data.session.status === "completed";
  const progressAction = isCompleted ? appendCompletedProgressAction : saveDailyProgressAction;
  const submitProgressAction = async (previous: DailyProgressCommandResult, formData: FormData) => {
    const outcome = await progressAction(previous, formData);
    if (outcome.ok) setEntries([]);
    return outcome;
  };
  const [state, formAction, isPending] = useActionState(submitProgressAction, initialResult);
  const affectedStudents = useMemo(
    () => new Set(entries.map((entry) => entry.studentId)).size,
    [entries],
  );
  const updateEntry = (clientId: string, patch: Partial<DraftEntry>) =>
    setEntries((current) =>
      current.map((entry) => (entry.clientId === clientId ? { ...entry, ...patch } : entry)),
    );
  const addEntry = (member: ClassDailyWorkspace["members"][number]) => {
    const plan = member.plans[0];
    const item =
      plan?.items.find((candidate) => candidate.status !== "completed") ?? plan?.items[0];
    if (!plan || !item) return;
    setEntries((current) => [
      ...current,
      {
        clientId: `${member.id}-${Date.now()}`,
        sessionMemberId: member.id,
        studentId: member.studentId,
        studyPlanId: plan.id,
        learningItemId: item.id,
        learningItemRevision: item.revision,
        status: item.status === "skipped" ? "pending" : item.status,
        note: "",
      },
    ]);
  };

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="sessionId" value={data.session.id} />
      <input type="hidden" name="sessionRevision" value={data.session.revision} />
      <input type="hidden" name="classId" value={data.session.classId} />
      <input
        type="hidden"
        name="entries"
        value={JSON.stringify(
          entries.map((entry) => ({
            sessionMemberId: entry.sessionMemberId,
            studentId: entry.studentId,
            studyPlanId: entry.studyPlanId,
            learningItemId: entry.learningItemId,
            learningItemRevision: entry.learningItemRevision,
            status: entry.status,
            note: entry.note,
          })),
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["班級成員", `${data.members.length} 位`],
          ["本次更新", `${affectedStudents} 位`],
          ["進度筆數", `${entries.length} 筆`],
          ["課堂狀態", data.session.status === "completed" ? "已完成" : "進行中"],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-bold text-slate-400">{label}</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {data.members.map((member) => {
          const memberEntries = entries.filter((entry) => entry.sessionMemberId === member.id);
          return (
            <section key={member.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b bg-slate-50/70 px-4 py-3">
                <span className="grid size-9 place-items-center rounded-full bg-teal-50 text-teal-700">
                  <UserRound size={17} />
                </span>
                <div>
                  <h2 className="font-bold">{member.studentName}</h2>
                  <p className="text-xs text-slate-500">{member.studentNumber}</p>
                </div>
                <span className="pill ml-auto bg-slate-100 text-slate-700">
                  {attendanceLabels[member.attendanceStatus]}
                </span>
              </div>
              <div className="space-y-3 p-4">
                {member.needsPlanSetup ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    尚未設定啟用中的教材版本，請先前往學生學習計畫設定。
                  </div>
                ) : memberEntries.length ? (
                  memberEntries.map((entry, index) => {
                    const plan = member.plans.find(
                      (candidate) => candidate.id === entry.studyPlanId,
                    )!;
                    const item = plan.items.find(
                      (candidate) => candidate.id === entry.learningItemId,
                    );
                    return (
                      <fieldset
                        key={entry.clientId}
                        className="rounded-xl border border-slate-200 p-3"
                      >
                        <legend className="px-2 text-xs font-bold text-slate-500">
                          本次進度 {index + 1}
                        </legend>
                        <div className="grid gap-3 lg:grid-cols-[1.1fr_1.2fr_.75fr_1.2fr_auto]">
                          <label className="text-xs font-bold text-slate-600">
                            學生教材
                            <select
                              aria-label={`${member.studentName}教材`}
                              className="input mt-1 w-full"
                              value={entry.studyPlanId}
                              onChange={(event) => {
                                const nextPlan = member.plans.find(
                                  (candidate) => candidate.id === event.target.value,
                                )!;
                                const nextItem =
                                  nextPlan.items.find(
                                    (candidate) => candidate.status === "in_progress",
                                  ) ??
                                  nextPlan.items.find(
                                    (candidate) => candidate.status === "pending",
                                  ) ??
                                  nextPlan.items[0];
                                updateEntry(entry.clientId, {
                                  studyPlanId: nextPlan.id,
                                  learningItemId: nextItem.id,
                                  learningItemRevision: nextItem.revision,
                                  status:
                                    nextItem.status === "skipped" ? "pending" : nextItem.status,
                                });
                              }}
                            >
                              {member.plans.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}｜{option.versionLabel}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs font-bold text-slate-600">
                            學習到的單元
                            <select
                              aria-label={`${member.studentName}學習單元`}
                              className="input mt-1 w-full"
                              value={entry.learningItemId}
                              onChange={(event) => {
                                const nextItem = plan.items.find(
                                  (candidate) => candidate.id === event.target.value,
                                )!;
                                updateEntry(entry.clientId, {
                                  learningItemId: nextItem.id,
                                  learningItemRevision: nextItem.revision,
                                  status:
                                    nextItem.status === "skipped" ? "pending" : nextItem.status,
                                });
                              }}
                            >
                              {plan.items.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.title}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs font-bold text-slate-600">
                            更新後狀態
                            <select
                              aria-label={`${member.studentName}學習狀態`}
                              className="input mt-1 w-full"
                              value={entry.status}
                              onChange={(event) =>
                                updateEntry(entry.clientId, {
                                  status: event.target.value as DraftEntry["status"],
                                })
                              }
                            >
                              {Object.entries(statusLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs font-bold text-slate-600">
                            備註（選填）
                            <input
                              aria-label={`${member.studentName}進度備註`}
                              className="input mt-1 w-full"
                              maxLength={300}
                              placeholder="例如：看到 p.42"
                              value={entry.note ?? ""}
                              onChange={(event) =>
                                updateEntry(entry.clientId, { note: event.target.value })
                              }
                            />
                          </label>
                          <button
                            type="button"
                            aria-label={`移除${member.studentName}第 ${index + 1} 筆進度`}
                            className="self-end rounded-lg border border-red-100 p-2.5 text-red-600"
                            onClick={() =>
                              setEntries((current) =>
                                current.filter(
                                  (candidate) => candidate.clientId !== entry.clientId,
                                ),
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {item && (
                          <p className="mt-2 text-xs text-slate-400">
                            目前狀態：
                            {statusLabels[item.status as keyof typeof statusLabels] ?? "已略過"}
                          </p>
                        )}
                      </fieldset>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">
                    本次不更新；既有教材進度不會被改變。
                  </div>
                )}
                {!member.needsPlanSetup && data.canManage && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold text-teal-800"
                    onClick={() => addEntry(member)}
                  >
                    <Plus size={14} />
                    {isCompleted ? "補登一筆教材進度" : "新增一筆教材進度"}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {state.message && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {state.message}
        </div>
      )}
      {data.canManage && (!isCompleted || entries.length > 0) && (
        <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-600">
              將更新 <b>{affectedStudents}</b> 位學生，共 <b>{entries.length}</b>{" "}
              筆進度；其餘學生不更新。
            </p>
            {isCompleted && (
              <label className="mt-2 block max-w-xl text-xs font-bold text-slate-600">
                補登原因
                <input
                  className="input mt-1 w-full"
                  name="reason"
                  maxLength={200}
                  placeholder="例如：課後補登老師紀錄"
                  required
                />
              </label>
            )}
          </div>
          <button
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {isPending ? <BookOpenCheck className="animate-pulse" size={17} /> : <Save size={17} />}
            {isPending ? "更新中…" : "統一更新課堂進度"}
          </button>
        </div>
      )}
    </form>
  );
}

export function ClassSessionHistory({ data }: { data: ClassDailyWorkspace }) {
  if (!data.history.length) return null;
  const supersededIds = new Set(
    data.history.map((entry) => entry.supersedesId).filter((id): id is string => Boolean(id)),
  );
  return (
    <section className="card mt-6 p-5" aria-labelledby="class-session-history">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="text-teal-700" size={18} />
        <h2 id="class-session-history" className="font-bold">
          本次儲存紀錄
        </h2>
      </div>
      <div className="mt-4 divide-y">
        {data.history.map((entry) => (
          <div key={entry.id} className="py-3 text-sm">
            <div className="grid gap-2 md:grid-cols-[8rem_1fr_8rem_1fr]">
              <b>{entry.studentName}</b>
              <span>
                {entry.planLabel}・{entry.learningItemTitle}
              </span>
              <span>{statusLabels[entry.statusAfterSession]}</span>
              <span className="text-slate-500">
                {entry.note || "無備註"}
                {entry.supersedesId && `（已更正：${entry.correctionReason}）`}
                {supersededIds.has(entry.id) && "（已有後續更正）"}
              </span>
            </div>
            {data.canManage &&
              data.session.status === "completed" &&
              !supersededIds.has(entry.id) && (
                <details className="mt-2 rounded-lg bg-slate-50 p-3">
                  <summary className="cursor-pointer text-xs font-bold text-teal-800">
                    更正這筆紀錄
                  </summary>
                  <form
                    action={correctDailyProgressAction}
                    className="mt-3 grid gap-2 md:grid-cols-4"
                  >
                    <input type="hidden" name="classId" value={data.session.classId} />
                    <input type="hidden" name="date" value={data.session.sessionDate} />
                    <input type="hidden" name="progressId" value={entry.id} />
                    <input type="hidden" name="revision" value={entry.revision} />
                    <label className="text-xs font-bold text-slate-600">
                      更正狀態
                      <select
                        className="input mt-1 w-full"
                        name="status"
                        defaultValue={entry.statusAfterSession}
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      備註（選填）
                      <input
                        className="input mt-1 w-full"
                        name="note"
                        maxLength={300}
                        defaultValue={entry.note ?? ""}
                      />
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      更正原因
                      <input className="input mt-1 w-full" name="reason" maxLength={200} required />
                    </label>
                    <button className="self-end rounded-lg border px-3 py-2.5 text-xs font-bold text-teal-800">
                      儲存更正
                    </button>
                  </form>
                </details>
              )}
          </div>
        ))}
      </div>
    </section>
  );
}
