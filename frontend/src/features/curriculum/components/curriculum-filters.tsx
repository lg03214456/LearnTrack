import { Filter } from "lucide-react";
import { Card } from "@/components/ui";
import type { CurriculumDirectory, CurriculumQuery } from "../curriculum.types";

export function CurriculumFilters({
  data,
  query,
}: {
  data: CurriculumDirectory;
  query: CurriculumQuery;
}) {
  const dimensions = [
    {
      name: "gradeId",
      label: "年級",
      empty: "全部年級",
      options: data.dimensions.grades,
      value: query.gradeId,
    },
    {
      name: "subjectId",
      label: "科目",
      empty: "全部科目",
      options: data.dimensions.subjects,
      value: query.subjectId,
    },
    {
      name: "publisherId",
      label: "版本來源",
      empty: "全部來源",
      options: data.dimensions.publishers,
      value: query.publisherId,
    },
  ];
  return (
    <Card className="mt-4 p-4">
      <form method="get" className="grid gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        {dimensions.map((dimension) => (
          <label key={dimension.name} className="text-xs font-medium text-slate-600">
            {dimension.label}
            <select
              name={dimension.name}
              defaultValue={dimension.value ?? ""}
              className="input mt-1 w-full"
            >
              <option value="">{dimension.empty}</option>
              {dimension.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className="text-xs font-medium text-slate-600">
          狀態
          <select name="status" defaultValue={query.status ?? ""} className="input mt-1 w-full">
            <option value="">全部狀態</option>
            <option value="published">已發布</option>
            <option value="draft">草稿</option>
            <option value="archived">已封存</option>
          </select>
        </label>
        <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-teal-700 px-4 text-sm font-bold text-teal-800 hover:bg-teal-50">
          <Filter size={15} />
          套用篩選
        </button>
      </form>
    </Card>
  );
}
