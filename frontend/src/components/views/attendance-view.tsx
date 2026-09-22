"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AttendanceRow, AttendanceStatus } from "@/features/attendance/attendance.types";
import { Card } from "@/components/ui";
const options: [AttendanceStatus, string][] = [
  ["present", "出席"],
  ["late", "遲到"],
  ["absent", "缺席"],
  ["leave", "請假"],
];
interface AttendanceViewProps {
  initial: AttendanceRow[];
  date?: string;
  classId?: string;
  classOptions?: { id: string; name: string }[];
  canManage?: boolean;
}
export function AttendanceView({
  initial,
  date = "2026-08-26",
  classId,
  classOptions = [],
  canManage = true,
}: AttendanceViewProps) {
  const [rows, setRows] = useState(initial),
    router = useRouter();
  const totals = useMemo(
    () =>
      Object.fromEntries(
        options.map(([status]) => [status, rows.filter((row) => row.status === status).length]),
      ),
    [rows],
  );
  const navigate = (updates: { date?: string; classId?: string }) => {
    const params = new URLSearchParams();
    params.set("date", updates.date ?? date);
    const nextClass = updates.classId === undefined ? classId : updates.classId;
    if (nextClass) params.set("classId", nextClass);
    router.push(`/attendance?${params}`);
  };
  return (
    <>
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <input
          aria-label="點名日期"
          className="input"
          type="date"
          value={date}
          onChange={(event) => navigate({ date: event.target.value })}
        />
        <select
          aria-label="點名班級"
          className="input"
          value={classId ?? ""}
          onChange={(event) => navigate({ classId: event.target.value })}
        >
          <option value="">全部今日班級</option>
          {classOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <div className="ml-auto flex flex-wrap gap-2">
          {options.map(([status, label]) => (
            <span key={status} className="pill bg-slate-50 text-slate-600">
              <i className="dot" />
              {label}: {totals[status]}
            </span>
          ))}
        </div>
      </Card>
      {!canManage && (
        <p className="mt-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          目前為唯讀模式，僅能查看授權範圍內的出缺席紀錄。
        </p>
      )}
      <Card className="mt-5 overflow-hidden">
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>學生姓名／學號</th>
                  <th>出缺席狀態</th>
                  <th>備註</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.studentId}>
                    <td>
                      <b>{row.name}</b>
                      <small className="block text-slate-400">{row.number}</small>
                    </td>
                    <td>
                      <div className="inline-flex rounded-lg border bg-slate-50 p-1">
                        {options.map(([status, label]) => (
                          <button
                            aria-label={`${row.name}-${label}`}
                            disabled={!canManage}
                            key={status}
                            onClick={() =>
                              setRows((current) =>
                                current.map((candidate) =>
                                  candidate.studentId === row.studentId
                                    ? { ...candidate, status }
                                    : candidate,
                                ),
                              )
                            }
                            className={`rounded-md px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-70 ${row.status === status ? (status === "present" ? "bg-brand text-white" : status === "late" ? "bg-amber-500 text-white" : status === "absent" ? "bg-red-600 text-white" : "bg-slate-600 text-white") : "text-slate-500"}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className={row.status === "absent" ? "text-red-600" : "text-slate-500"}>
                      {row.note || "—"}
                    </td>
                    <td>{canManage ? "•••" : "唯讀"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">這一天沒有符合排課的應到學生</div>
        )}
        <div className="border-t p-4 text-xs text-slate-500">
          顯示 {rows.length} 筆，共 {rows.length} 筆
        </div>
      </Card>
    </>
  );
}
