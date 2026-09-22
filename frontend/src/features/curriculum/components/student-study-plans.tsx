import { BookOpenCheck, CircleCheckBig, Plus } from "lucide-react";
import { Card, ProgressBar } from "@/components/ui";
import type { StudentStudyPlanPage } from "../curriculum.types";
import { createPlanAction, updateLearningItemAction } from "@/app/actions/curriculum-actions";

const statusLabels = {
  pending: "待進行",
  in_progress: "進行中",
  completed: "已完成",
  skipped: "略過",
} as const;

export function StudentStudyPlansView({
  data,
  canManage,
}: {
  data: StudentStudyPlanPage;
  canManage: boolean;
}) {
  return (
    <>
      {canManage && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 border-b bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-white">
              <Plus size={18} />
            </span>
            <div>
              <h2 className="font-bold">新增修課計畫</h2>
              <p className="text-xs text-slate-500">選擇學期與教材版本，建立後即可開始記錄進度。</p>
            </div>
          </div>
          <form action={createPlanAction} className="flex flex-wrap gap-3 p-5">
            <input type="hidden" name="studentId" value={data.student.id} />
            <select aria-label="修課學期" name="termId" className="input">
              {data.terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
            <select aria-label="教材版本" name="versionId" className="input min-w-64 flex-1">
              {data.availableVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.label}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800">
              建立並啟用
            </button>
          </form>
        </Card>
      )}
      <div className="stagger-grid mt-5 grid gap-5 xl:grid-cols-2">
        {data.plans.map((plan) => {
          const completedCount = plan.items.filter((item) => item.status === "completed").length;
          return (
            <Card key={plan.id} className="overflow-hidden">
              <div className="border-b bg-slate-50/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <BookOpenCheck size={19} />
                    </span>
                    <div>
                      <p className="text-xs text-slate-500">
                        {plan.term}・{plan.grade}・{plan.publisher}
                      </p>
                      <h2 className="mt-1 font-bold">
                        {plan.subject}｜{plan.templateName} v{plan.version}
                      </h2>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-emerald-700">{plan.percentage}%</span>
                </div>
                <div className="mt-4">
                  <ProgressBar value={plan.percentage} />
                </div>
                <p className="mt-2 text-right text-xs text-slate-400">
                  已完成 {completedCount} / {plan.items.length} 項
                </p>
              </div>
              <div className="divide-y divide-slate-100 px-5">
                {plan.items.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                    <span
                      className={`grid size-7 place-items-center rounded-full ${item.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
                    >
                      <CircleCheckBig size={15} />
                    </span>
                    <span className="min-w-40 flex-1 font-medium">{item.title}</span>
                    {canManage ? (
                      <form action={updateLearningItemAction} className="flex gap-2">
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="studentId" value={data.student.id} />
                        <select
                          aria-label={`${item.title}狀態`}
                          name="status"
                          defaultValue={item.status}
                          className="input h-9 py-1 text-xs"
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <button className="rounded-lg border border-emerald-700 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
                          更新
                        </button>
                      </form>
                    ) : (
                      <span className="pill bg-slate-100 text-slate-600">
                        {statusLabels[item.status]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      {!data.plans.length && (
        <Card className="mt-5 p-10 text-center">
          <BookOpenCheck className="mx-auto text-slate-300" size={30} />
          <p className="mt-3 font-bold">尚未建立修課計畫</p>
          <p className="mt-1 text-sm text-slate-500">請從上方選擇教材版本開始。</p>
        </Card>
      )}
    </>
  );
}
