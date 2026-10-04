"use client";
import { AlertCircle, Award, CheckCircle2, Sigma } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Analytics } from "@/features/analytics/analytics.types";
import { Card, Metric, ProgressBar } from "@/components/ui";
export function AnalyticsView({ analytics }: { analytics: Analytics }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="整體平均分數"
          value={`${analytics.averageScore}分`}
          sub="較上月提升 2.4%"
          icon={Sigma}
        />
        <Metric
          label="課程完成率"
          value={`${analytics.completion}%`}
          sub="持續穩定成長"
          icon={CheckCircle2}
          tone="blue"
        />
        <Metric label="表現優異學生" value="45位" icon={Award} />
        <Metric label="需關注學生" value={analytics.atRisk} icon={AlertCircle} tone="red" />
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex justify-between">
            <b>近半年學習表現趨勢</b>
            <select className="input h-8">
              <option>全科平均</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.trend}>
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--brand)" stopOpacity={0.25} />
                    <stop offset="1" stopColor="var(--brand)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis domain={[50, 100]} />
                <Tooltip />
                <Area dataKey="score" stroke="var(--brand)" fill="url(#fill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <b>成績區間分佈</b>
          <p className="mb-5 text-xs text-slate-500">本月期中測驗</p>
          {analytics.bands.map((scoreBand) => (
            <div key={scoreBand.label} className="mb-4">
              <div className="mb-1 flex justify-between text-xs">
                <span>{scoreBand.label}</span>
                <b>{scoreBand.value}%</b>
              </div>
              <ProgressBar value={scoreBand.value} color={scoreBand.color} />
            </div>
          ))}
        </Card>
      </div>
      <Card className="mt-5 overflow-hidden">
        <div className="flex justify-between p-5">
          <b>各科學習狀況分析</b>
          <span className="text-brand text-xs">查看完整報告 →</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>科目／班級</th>
                <th>授課老師</th>
                <th>平均進度</th>
                <th>平均分數</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {analytics.classes.map((classAnalytics) => (
                <tr key={classAnalytics.name}>
                  <td>
                    <b>{classAnalytics.name}</b>
                  </td>
                  <td>{classAnalytics.teacher}</td>
                  <td>
                    <div className="flex w-44 items-center gap-3">
                      <ProgressBar value={classAnalytics.progress} />
                      {classAnalytics.progress}%
                    </div>
                  </td>
                  <td
                    className={classAnalytics.score < 70 ? "font-bold text-red-600" : "font-bold"}
                  >
                    {classAnalytics.score} 分
                  </td>
                  <td>{classAnalytics.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
