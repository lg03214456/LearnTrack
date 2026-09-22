import { Plus } from "lucide-react";
import { createTemplateAction } from "@/app/actions/curriculum-actions";
import { Card } from "@/components/ui";
import type { CurriculumDirectory } from "../curriculum.types";

export function CurriculumCreateForm({ data }: { data: CurriculumDirectory }) {
  return (
    <Card className="mt-4 p-5">
      <h2 className="flex items-center gap-2 font-bold">
        <Plus className="text-blue-600" size={18} />
        建立新範本
      </h2>
      <form
        action={createTemplateAction}
        className="mt-4 grid gap-3 md:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(0,1fr))_auto]"
      >
        <label className="text-xs font-medium text-slate-600">
          範本名稱
          <input
            name="name"
            required
            className="input mt-1 w-full"
            placeholder="例如：112學年上學期數學"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          年級
          <select aria-label="建立範本年級" name="gradeId" className="input mt-1 w-full">
            {data.dimensions.grades.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          科目
          <select aria-label="建立範本科目" name="subjectId" className="input mt-1 w-full">
            {data.dimensions.subjects.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          版本
          <select aria-label="建立範本來源" name="publisherId" className="input mt-1 w-full">
            {data.dimensions.publishers.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <button className="mt-5 h-10 rounded-lg bg-teal-800 px-5 text-sm font-bold text-white hover:bg-teal-900">
          建立草稿
        </button>
      </form>
    </Card>
  );
}
