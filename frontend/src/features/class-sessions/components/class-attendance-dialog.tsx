"use client";

import { useEffect, useRef, useState } from "react";
import { saveClassAttendanceAction } from "@/app/actions/class-attendance-actions";
import { CurriculumEditorDialog } from "@/features/curriculum/components/curriculum-editor-dialog";
import type { ClassAttendanceEntry, ClassDailyWorkspace } from "../class-session.types";
import { arrivalTimeInTaipei, CLASS_ATTENDANCE_LABELS, classRecordTime } from "../class-attendance";

export function ClassAttendanceDialog({
  data,
  onClose,
  onSaved,
  onReload,
}: {
  data: ClassDailyWorkspace;
  onClose: () => void;
  onSaved: (message: string) => void;
  onReload: () => void;
}) {
  const [changes, setChanges] = useState<Partial<Record<string, ClassAttendanceEntry>>>({});
  const [reason, setReason] = useState("");
  const [isPending, setPending] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  const canSave = data.attendanceAvailable && data.canManageAttendance;
  const entries = Object.values(changes).filter((entry): entry is ClassAttendanceEntry => {
    if (!entry) return false;
    const member = data.members.find((candidate) => candidate.id === entry.sessionMemberId)!;
    return (
      entry.status !== member.attendanceStatus ||
      (entry.arrivalTime ?? "") !== arrivalTimeInTaipei(member.attendance?.arrivedAt)
    );
  });
  const needsReason =
    data.session.status === "completed" || entries.some((entry) => entry.previousRecordId);
  const update = (
    member: ClassDailyWorkspace["members"][number],
    status: ClassAttendanceEntry["status"],
    arrivalTime = "",
  ) => {
    setChanges((current) => ({
      ...current,
      [member.id]: {
        sessionMemberId: member.id,
        studentId: member.studentId,
        previousRecordId: member.attendance?.id,
        status,
        arrivalTime: status === "late" ? arrivalTime : "",
      },
    }));
  };

  return (
    <CurriculumEditorDialog title="課堂點名" onClose={onClose} isPending={isPending}>
      <form
        className="min-w-0 space-y-4"
        aria-busy={isPending}
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy.current || needsReload || !canSave || !entries.length) return;
          if (needsReason && !reason.trim()) {
            setMessage("請填寫更正／補登原因");
            return;
          }
          busy.current = true;
          setPending(true);
          setMessage("");
          const form = new FormData();
          form.set(
            "command",
            JSON.stringify({
              sessionId: data.session.id,
              sessionRevision: data.session.revision,
              entries,
              reason,
            }),
          );
          try {
            const outcome = await saveClassAttendanceAction(form);
            if (!isMounted.current) return;
            if (outcome.ok) onSaved(outcome.message);
            else {
              setMessage(outcome.message);
              setNeedsReload(["CONFLICT", "FORBIDDEN", "NOT_FOUND"].includes(outcome.code));
            }
          } catch {
            if (isMounted.current) {
              setNeedsReload(true);
              setMessage("無法確認儲存結果，請重新載入確認點名紀錄，避免重複登記。");
            }
          } finally {
            busy.current = false;
            if (isMounted.current) setPending(false);
          }
        }}
      >
        <p className="text-sm text-slate-500">
          {data.session.sessionDate} · {data.members.length}{" "}
          位學生。只儲存有變更的人員，未選擇者保持原狀。
        </p>
        {!data.attendanceAvailable ? (
          <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            點名儲存尚未啟用，請先套用 202610190001_class_attendance_and_history.sql，再重新載入。
          </p>
        ) : (
          !data.canManageAttendance && (
            <p className="text-sm text-slate-500">唯讀檢視，沒有更新點名的權限。</p>
          )
        )}
        <fieldset disabled={isPending || needsReload || !canSave} className="min-w-0 space-y-3">
          {data.members.map((member) => {
            const draft = changes[member.id];
            const status = draft?.status ?? member.attendanceStatus;
            const arrivalTime =
              draft?.arrivalTime ?? arrivalTimeInTaipei(member.attendance?.arrivedAt);
            return (
              <fieldset key={member.id} className="min-w-0 rounded-xl border border-slate-200 p-3">
                <legend className="max-w-full px-1 text-sm font-bold break-words">
                  {member.studentName} · {member.studentNumber}
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(CLASS_ATTENDANCE_LABELS).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-2 py-3 text-sm has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50 has-[:checked]:text-teal-900"
                    >
                      <input
                        type="radio"
                        name={`attendance-${member.id}`}
                        checked={status === value}
                        onChange={() =>
                          update(member, value as ClassAttendanceEntry["status"], arrivalTime)
                        }
                        className="size-4 accent-teal-700"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {status === "pending" && <p className="mt-2 text-xs text-slate-500">尚未點名</p>}
                {status === "late" && (
                  <label className="mt-3 block text-sm">
                    實際到課時間（選填）
                    <input
                      type="time"
                      value={arrivalTime}
                      onChange={(event) => update(member, "late", event.target.value)}
                      className="input mt-1 block w-full min-w-0"
                    />
                    <span className="mt-1 block text-xs text-slate-500">
                      以課堂日期、台北時間記錄；留空不會自動填現在時間。
                    </span>
                  </label>
                )}
                {member.attendance?.recordedAt && (
                  <p className="mt-2 text-xs text-slate-500">
                    登記時間：{classRecordTime(member.attendance.recordedAt)}（台北時間）
                  </p>
                )}
              </fieldset>
            );
          })}
          {!data.members.length && <p className="text-sm text-slate-500">這堂課目前沒有學生。</p>}
          {needsReason && (
            <label className="block text-sm">
              更正／補登原因
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={200}
                required
                className="input mt-1 w-full"
              />
            </label>
          )}
        </fieldset>
        <p className="text-xs text-slate-500">調課不等於請假或缺席；調課流程尚未納入本次點名。</p>
        {message && (
          <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            {message}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            取消
          </button>
          {needsReload ? (
            <button
              type="button"
              onClick={onReload}
              className="rounded-lg bg-teal-800 px-4 py-2 text-sm text-white"
            >
              重新載入
            </button>
          ) : (
            <button
              disabled={isPending || !canSave || !entries.length}
              className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {isPending ? "儲存中…" : `確認儲存（${entries.length} 人）`}
            </button>
          )}
        </div>
      </form>
    </CurriculumEditorDialog>
  );
}
