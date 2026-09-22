import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui";
import type { CurriculumDirectory, CurriculumQuery, VersionStatus } from "../curriculum.types";
import { CurriculumCreateForm } from "./curriculum-create-form";
import { CurriculumFilters } from "./curriculum-filters";
import { CurriculumTemplateCard } from "./curriculum-template-card";

function filterHref(query: CurriculumQuery, status?: VersionStatus) {
  const params = new URLSearchParams();
  if (query.gradeId) params.set("gradeId", query.gradeId);
  if (query.subjectId) params.set("subjectId", query.subjectId);
  if (query.publisherId) params.set("publisherId", query.publisherId);
  if (status) params.set("status", status);
  const value = params.toString();
  return value ? `/curriculum/templates?${value}` : "/curriculum/templates";
}

export function CurriculumDirectoryView({
  data,
  query = {},
  canManage,
}: {
  data: CurriculumDirectory;
  query?: CurriculumQuery;
  canManage: boolean;
}) {
  const tabs = [
    { label: "全部教材", count: data.summary.total },
    { label: "已發布", count: data.summary.published, status: "published" as const },
    { label: "草稿中", count: data.summary.draft, status: "draft" as const },
  ];
  return (
    <>
      <div className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
        <div>
          <b>開發階段資料</b>
          <p className="mt-1 text-xs text-amber-800">
            目前操作保存在伺服器記憶體，重新啟動後會還原；正式營運仍需 Supabase 與 RLS。
          </p>
        </div>
      </div>
      <div className="flex gap-6 overflow-x-auto border-b border-slate-200">
        {tabs.map((tab) => {
          const isActive = (query.status ?? "") === (tab.status ?? "");
          return (
            <Link
              key={tab.label}
              href={filterHref(query, tab.status)}
              className={`border-b-2 px-2 pb-3 text-sm font-bold whitespace-nowrap ${isActive ? "border-teal-700 text-teal-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {tab.label} <span className="text-xs">({tab.count})</span>
            </Link>
          );
        })}
      </div>
      <CurriculumFilters data={data} query={query} />
      {canManage && <CurriculumCreateForm data={data} />}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {data.rows.map((row) => (
          <CurriculumTemplateCard key={row.id} row={row} />
        ))}
      </div>
      {data.rows.length === 0 && (
        <Card className="mt-5 p-10 text-center text-slate-500">
          沒有符合條件的教材範本，請調整篩選條件或切換上方狀態。
        </Card>
      )}
    </>
  );
}
