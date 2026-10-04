"use client";
import { useMemo, useState } from "react";
import { AlertCircle, BookOpen, CheckCircle2, Users } from "lucide-react";
import type { ProgressRow } from "@/features/progress/progress.types";
import { Card, Metric, ProgressBar, Status } from "@/components/ui";
export function ProgressView({ rows }: { rows: ProgressRow[] }) {
  const [searchQuery, setSearchQuery] = useState(""),
    [selectedClassName, setSelectedClassName] = useState("all");
  const filteredProgressRows = useMemo(
    () =>
      rows.filter(
        (progressRow) =>
          (progressRow.name.includes(searchQuery) ||
            progressRow.number.toLowerCase().includes(searchQuery.toLowerCase())) &&
          (selectedClassName === "all" || progressRow.className === selectedClassName),
      ),
    [rows, searchQuery, selectedClassName],
  );
  const averageProgress = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.progress, 0) / rows.length)
    : 0;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="學習學生" value={rows.length} icon={Users} />
        <Metric label="平均完成度" value={`${averageProgress}%`} icon={CheckCircle2} />
        <Metric
          label="待完成項目"
          value={rows.reduce((sum, row) => sum + Math.max(0, row.total - row.completed), 0)}
          icon={BookOpen}
          tone="blue"
        />
        <Metric
          label="需要關注"
          value={rows.filter((progressRow) => progressRow.status === "behind").length}
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
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <select
            aria-label="班級篩選"
            className="input"
            value={selectedClassName}
            onChange={(event) => setSelectedClassName(event.target.value)}
          >
            <option value="all">全部班級</option>
            {[...new Set(rows.map((progressRow) => progressRow.className))].map((className) => (
              <option key={className}>{className}</option>
            ))}
          </select>
        </div>
        {filteredProgressRows.length ? (
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
                {filteredProgressRows.map((progressRow) => (
                  <tr key={`${progressRow.studentId}:${progressRow.className}`}>
                    <td>
                      <b>{progressRow.name}</b>
                      <small className="block text-slate-400">{progressRow.number}</small>
                    </td>
                    <td>{progressRow.className}</td>
                    <td>
                      <div className="flex w-44 items-center gap-3">
                        <span>{progressRow.progress}%</span>
                        <ProgressBar
                          value={progressRow.progress}
                          color={progressRow.status === "behind" ? "#dc2626" : undefined}
                        />
                      </div>
                    </td>
                    <td>
                      {progressRow.completed}/{progressRow.total}
                    </td>
                    <td className={progressRow.score < 70 ? "font-bold text-red-600" : "font-bold"}>
                      {progressRow.score} 分
                    </td>
                    <td>
                      <Status value={progressRow.status} />
                    </td>
                    <td>{progressRow.recent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-slate-500">
            {rows.length ? "找不到符合條件的學生" : "目前尚無學生進度紀錄"}
            <br />
            {rows.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedClassName("all");
                }}
                className="text-brand mt-3 underline"
              >
                清除篩選
              </button>
            )}
          </div>
        )}
        <div className="border-t p-4 text-xs text-slate-500">
          顯示 1–{filteredProgressRows.length} 筆，共 {filteredProgressRows.length} 筆
        </div>
      </Card>
    </>
  );
}
