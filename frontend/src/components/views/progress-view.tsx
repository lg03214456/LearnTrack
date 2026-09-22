"use client";
import { useMemo, useState } from "react";
import { AlertCircle, BookOpen, CheckCircle2, Users } from "lucide-react";
import type { ProgressRow } from "@/server/domain/types";
import { Card, Metric, ProgressBar, Status } from "@/components/ui";
export function ProgressView({ rows }: { rows: ProgressRow[] }) {
  const [q, setQ] = useState(""),
    [cls, setCls] = useState("all");
  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (r.name.includes(q) || r.number.toLowerCase().includes(q.toLowerCase())) &&
          (cls === "all" || r.className === cls),
      ),
    [rows, q, cls],
  );
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="學習學生" value={rows.length * 4 + 4} sub="本週新增 3 位" icon={Users} />
        <Metric
          label="平均完成度"
          value={`${Math.round(rows.reduce((a, b) => a + b.progress, 0) / rows.length)}%`}
          sub="較上月 ↑ 6%"
          icon={CheckCircle2}
        />
        <Metric label="待完成作業" value="12份" icon={BookOpen} tone="blue" />
        <Metric
          label="需要關注"
          value={rows.filter((r) => r.status === "behind").length}
          sub="進度低於標準"
          icon={AlertCircle}
          tone="red"
        />
      </div>
      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b p-4">
          <input
            aria-label="搜尋學生"
            className="input min-w-64 flex-1"
            placeholder="搜尋學生姓名或學號..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            aria-label="班級篩選"
            className="input"
            value={cls}
            onChange={(e) => setCls(e.target.value)}
          >
            <option value="all">全部班級</option>
            {[...new Set(rows.map((r) => r.className))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        {visible.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>學生</th>
                  <th>班級／目前課程</th>
                  <th>課程進度</th>
                  <th>完成</th>
                  <th>最近成績</th>
                  <th>學習狀態</th>
                  <th>最近學習</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.studentId}>
                    <td>
                      <b>{r.name}</b>
                      <small className="block text-slate-400">{r.number}</small>
                    </td>
                    <td>{r.className}</td>
                    <td>
                      <div className="flex w-44 items-center gap-3">
                        <span>{r.progress}%</span>
                        <ProgressBar
                          value={r.progress}
                          color={r.status === "behind" ? "#dc2626" : undefined}
                        />
                      </div>
                    </td>
                    <td>
                      {r.completed}/{r.total}
                    </td>
                    <td className={r.score < 70 ? "font-bold text-red-600" : "font-bold"}>
                      {r.score} 分
                    </td>
                    <td>
                      <Status value={r.status} />
                    </td>
                    <td>{r.recent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-slate-500">
            找不到符合條件的學生
            <br />
            <button
              onClick={() => {
                setQ("");
                setCls("all");
              }}
              className="text-brand mt-3 underline"
            >
              清除篩選
            </button>
          </div>
        )}
        <div className="border-t p-4 text-xs text-slate-500">
          顯示 1–{visible.length} 筆，共 {visible.length} 筆
        </div>
      </Card>
    </>
  );
}
