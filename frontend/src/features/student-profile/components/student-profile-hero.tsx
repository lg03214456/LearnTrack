import { BookOpen, CalendarDays, GraduationCap, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui";
import type { StudentDetailView } from "../student-profile.types";

const summaryItems = [
  { key: "average", label: "平均成績", icon: TrendingUp, tone: "bg-brand-soft text-brand" },
  { key: "latest", label: "最近成績", icon: CalendarDays, tone: "bg-emerald-50 text-emerald-600" },
  { key: "results", label: "考試紀錄", icon: BookOpen, tone: "bg-amber-50 text-amber-600" },
] as const;

export function StudentProfileHero({ detail }: { detail: StudentDetailView }) {
  const { profile, assessment } = detail;
  const values = {
    average:
      assessment.summary.averagePercentage === null
        ? "—"
        : `${assessment.summary.averagePercentage}%`,
    latest:
      assessment.summary.latestPercentage === null
        ? "—"
        : `${assessment.summary.latestPercentage}%`,
    results: `${assessment.summary.resultCount} 筆`,
  };
  return (
    <section aria-label="學生摘要" className="mb-5 space-y-3">
      <div className="from-brand-deep via-brand relative overflow-hidden rounded-2xl bg-gradient-to-r to-teal-600 p-5 text-white shadow-lg shadow-teal-950/10">
        <div
          aria-hidden="true"
          className="absolute -top-16 -right-12 size-44 rounded-full bg-white/10"
        />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-white/15 text-xl font-bold ring-1 ring-white/20">
            {profile.name[0]}
          </span>
          <div>
            <p className="text-xs font-semibold tracking-wide text-teal-50">{profile.number}</p>
            <h2 className="mt-0.5 text-2xl font-bold">{profile.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-teal-50">
              <GraduationCap size={15} />
              {profile.school}・{profile.grade}
            </p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-50 ring-1 ring-emerald-200/30">
            ● {profile.status === "active" ? "在籍" : "停課中"}
          </span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key} className="flex items-center gap-3 px-4 py-3">
              <span className={`grid size-9 place-items-center rounded-xl ${item.tone}`}>
                <Icon aria-hidden="true" size={17} />
              </span>
              <div>
                <p className="text-xs font-medium text-slate-500">{item.label}</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">{values[item.key]}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
