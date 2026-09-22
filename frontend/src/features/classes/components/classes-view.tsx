"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, CalendarCheck2, Clock, FlaskConical, Pencil, Plus, Users } from "lucide-react";
import { changeClassLifecycleAction } from "@/app/actions/class-management-actions";
import { Card, ProgressBar } from "@/components/ui";
import type { ClassOverviewRow } from "../class-management.types";
const typeLabels = { progress: "進度授課班", individual: "個別指導班", study: "自習加強班" },
  statusLabels = {
    recruiting: "招生中",
    active: "上課中",
    completed: "已結業",
    archived: "已封存",
  },
  days = ["日", "一", "二", "三", "四", "五", "六"];
export function ClassesView({ rows, canCreate }: { rows: ClassOverviewRow[]; canCreate: boolean }) {
  const [search, setSearch] = useState(""),
    [grade, setGrade] = useState("");
  const visible = useMemo(
    () =>
      rows.filter(
        (x) =>
          (x.name.includes(search) || x.code.toLowerCase().includes(search.toLowerCase())) &&
          (!grade || x.grades.includes(grade) || x.allGrades),
      ),
    [rows, search, grade],
  );
  return (
    <>
      <div className="mb-4 flex justify-end">
        {canCreate && (
          <Link
            href="/classes/new"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-bold text-white"
          >
            <Plus size={16} />
            新增班級
          </Link>
        )}
      </div>
      <Card className="flex flex-wrap gap-3 p-4">
        <input
          aria-label="搜尋班級"
          className="input min-w-64 flex-1"
          placeholder="搜尋課程名稱或代碼..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="年級篩選"
          className="input"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        >
          <option value="">所有年級</option>
          {[...new Set(rows.flatMap((x) => x.grades))].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </Card>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((row, index) => (
          <Card key={row.id} className="p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-blue-50 p-3 text-blue-600">
                {index === 2 ? <FlaskConical /> : <BookOpen />}
              </span>
              <div className="min-w-0">
                <h2 className="font-bold">{row.name}</h2>
                <p className="text-xs text-slate-500">
                  {row.code}・{typeLabels[row.type]}
                </p>
              </div>
              <span
                className={`pill ml-auto ${row.status === "active" ? "bg-emerald-50 text-emerald-700" : row.status === "recruiting" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}
              >
                {statusLabels[row.status]}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-1">
              {[...(row.allGrades ? ["全年級"] : row.grades), ...row.subjects].map((x) => (
                <span key={x} className="rounded-full bg-slate-100 px-2 py-1 text-[11px]">
                  {x}
                </span>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="text-slate-500">
                授課老師
                <br />
                <b className="text-slate-800">{row.teacherName}</b>
              </div>
              <div className="text-slate-500">
                學生人數
                <br />
                <b className="text-slate-800">
                  {row.studentCount}
                  {row.capacity ? ` / ${row.capacity}` : " / 無上限"} 位
                </b>
              </div>
              <div className="col-span-2 space-y-1 text-slate-500">
                {row.schedules.length ? (
                  row.schedules.map((slot, i) => (
                    <div key={i} className="flex gap-2">
                      <Clock size={14} />
                      星期{days[slot.weekday]} {slot.startTime}–{slot.endTime}
                      {slot.room && `・${slot.room}`}
                    </div>
                  ))
                ) : (
                  <div>尚未排課</div>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-between text-xs">
              <span>課程進度</span>
              <b>{row.progress}%</b>
            </div>
            <ProgressBar value={row.progress} />
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
              {row.status === "active" && (
                <Link
                  aria-label={`進入${row.name}今日課堂`}
                  href={`/classes/${row.id}`}
                  className="rounded-lg bg-teal-800 px-3 py-2 text-xs font-bold text-white"
                >
                  <CalendarCheck2 size={13} className="mr-1 inline" />
                  今日課堂
                </Link>
              )}
              <Link
                aria-label={`查看${row.name}學生名單`}
                href={`/students?classId=${row.id}`}
                className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-700"
              >
                <Users size={13} className="mr-1 inline" />
                查看名單
              </Link>
              {row.capabilities.canEdit && (
                <Link
                  href={`/classes/${row.id}/edit`}
                  className="rounded-lg border px-3 py-2 text-xs font-bold"
                >
                  <Pencil size={13} className="mr-1 inline" />
                  編輯
                </Link>
              )}
              {row.capabilities.canChangeLifecycle && row.status !== "archived" && (
                <form action={changeClassLifecycleAction}>
                  <input type="hidden" name="classId" value={row.id} />
                  <input type="hidden" name="revision" value={row.revision} />
                  <input
                    type="hidden"
                    name="status"
                    value={row.status === "completed" ? "archived" : "completed"}
                  />
                  <button
                    onClick={(e) => {
                      if (
                        !confirm(
                          row.status === "completed" ? "確定封存班級？" : "確定將班級設為結業？",
                        )
                      )
                        e.preventDefault();
                    }}
                    className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700"
                  >
                    {row.status === "completed" ? "封存" : "結業"}
                  </button>
                </form>
              )}
            </div>
          </Card>
        ))}
      </div>
      {!visible.length && (
        <Card className="mt-5 p-12 text-center text-slate-500">沒有符合條件的班級</Card>
      )}
    </>
  );
}
