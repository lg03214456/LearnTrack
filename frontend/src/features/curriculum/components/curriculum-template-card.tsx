import Link from "next/link";
import { BookOpen, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui";
import type { CurriculumDirectory, VersionStatus } from "../curriculum.types";

const statusLabel: Record<VersionStatus, string> = { draft: "草稿", published: "已發布" };
type CurriculumRow = CurriculumDirectory["rows"][number];

export function CurriculumTemplateCard({ row }: { row: CurriculumRow }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
          <BookOpen size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">
            {row.grade}・{row.subject}・{row.publisher}
          </p>
          <h2 className="mt-1 font-bold">{row.name}</h2>
        </div>
        <button
          aria-label={`${row.name}更多操作`}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <MoreVertical size={17} />
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {row.versions.map((version) => (
          <Link
            key={version.id}
            className="flex items-center rounded-lg border border-slate-200 p-3 text-sm transition hover:border-teal-700 hover:bg-teal-50/30"
            href={`/curriculum/templates/${version.id}`}
          >
            <b>版本 {version.number}</b>
            <span
              className={`pill ml-3 ${version.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}
            >
              {statusLabel[version.status]}
            </span>
            <span className="ml-auto text-xs text-slate-500">{version.itemCount} 項單元</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
