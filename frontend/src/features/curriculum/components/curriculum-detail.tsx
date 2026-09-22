"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { addTemplateItemStateAction, publishVersionAction } from "@/app/actions/curriculum-actions";
import { Card } from "@/components/ui";
import type { CurriculumDetail, CurriculumItemFormState } from "../curriculum.types";
import { CurriculumSortableList, itemTypeLabels } from "./curriculum-sortable-list";

const initialState: CurriculumItemFormState = {
  ok: false,
  code: "OK",
  message: "",
  values: { title: "", type: "unit" },
};
function SubmitButton({ children, className }: { children: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`${className} disabled:cursor-wait disabled:opacity-50`}>
      {pending ? "處理中…" : children}
    </button>
  );
}
function AddItemForm({ data }: { data: CurriculumDetail }) {
  const [state, action, pending] = useActionState(addTemplateItemStateAction, initialState);
  const [selectedType, setSelectedType] = useState(state.values.type);
  const units = data.items.filter((item) => item.type === "unit" && !item.parentId);
  const needsParent = selectedType !== "unit";
  return (
    <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
      <div className="mb-4">
        <h2 className="font-bold">新增教材項目</h2>
        <p className="mt-1 text-xs text-slate-500">
          新項目會加入清單最後，可使用拖曳把手調整順序。
        </p>
      </div>
      <form
        key={`${state.message}-${state.values.type}`}
        action={action}
        className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[9rem_12rem_minmax(0,1fr)_auto]"
      >
        <input type="hidden" name="versionId" value={data.versionId} />
        <input type="hidden" name="revision" value={data.revision} />
        <label className="text-xs font-medium text-slate-600">
          項目類型
          <select
            name="type"
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value as typeof selectedType)}
            className="input mt-1 w-full"
          >
            {Object.entries(itemTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          所屬單元
          <select
            name="parentId"
            defaultValue={state.values.parentId ?? ""}
            disabled={!needsParent}
            required={needsParent && units.length > 0}
            className="input mt-1 w-full disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">{needsParent ? "請選擇單元" : "單元為最上層"}</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.title}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-xs font-medium text-slate-600">
          項目名稱
          <input
            required
            name="title"
            defaultValue={state.values.title}
            className="input mt-1 w-full"
            placeholder={
              selectedType === "unit" ? "例如：單元 4　機率與統計" : "例如：4-1 樣本與母體"
            }
          />
        </label>
        <div className="flex items-end">
          <SubmitButton className="h-10 w-full rounded-lg bg-teal-800 px-5 text-sm font-bold text-white md:w-auto">
            新增項目
          </SubmitButton>
        </div>
        {state.message && (
          <p
            role="status"
            className={`rounded-lg px-3 py-2 text-sm md:col-span-2 xl:col-span-4 ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
          >
            {state.message}
          </p>
        )}
        <span className="sr-only" aria-live="polite">
          {pending ? "正在新增項目" : ""}
        </span>
      </form>
    </div>
  );
}

export function CurriculumDetailView({
  data,
  canManage,
}: {
  data: CurriculumDetail;
  canManage: boolean;
}) {
  const canEdit = canManage && data.status === "draft";
  const [isAddingItem, setIsAddingItem] = useState(false);
  return (
    <>
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-xs text-slate-500">
              {data.template.grade}・{data.template.subject}・{data.template.publisher}
            </p>
            <h2 className="text-xl font-bold">版本 {data.versionNumber}</h2>
          </div>
          <span
            className={`pill ${data.status === "draft" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
          >
            {data.status === "draft" ? "草稿" : "已發布"}
          </span>
          {canEdit && (
            <form action={publishVersionAction} className="ml-auto">
              <input type="hidden" name="versionId" value={data.versionId} />
              <SubmitButton className="rounded-lg bg-teal-800 px-4 py-2 text-sm text-white">
                發布版本
              </SubmitButton>
            </form>
          )}
        </div>
      </Card>
      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold">內容清單</h2>
            <p className="mt-1 text-xs text-slate-500">
              共 {data.items.length} 個項目{canEdit ? "・拖曳把手可調整順序" : "・目前版本為唯讀"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center gap-2 text-xs" aria-label="教材層級說明">
              <span className="rounded-md bg-teal-700 px-2 py-1 font-bold text-white">單元</span>
              <span className="text-slate-400">包含</span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-slate-600">
                章節／教材內容
              </span>
            </div>
            {canEdit && (
              <button
                type="button"
                aria-expanded={isAddingItem}
                onClick={() => setIsAddingItem((value) => !value)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3 py-2 text-xs font-bold text-white hover:bg-teal-900"
              >
                {isAddingItem ? (
                  <X size={15} aria-hidden="true" />
                ) : (
                  <Plus size={15} aria-hidden="true" />
                )}
                {isAddingItem ? "收合新增內容" : "新增內容"}
              </button>
            )}
          </div>
        </div>
        {canEdit && isAddingItem && <AddItemForm data={data} />}
        {canEdit ? (
          <CurriculumSortableList key={data.revision} data={data} />
        ) : (
          <ol className="mt-4 space-y-2">
            {data.items.map((item, index) => (
              <li
                key={item.id}
                data-level={item.type === "unit" && !item.parentId ? "unit" : "content"}
                className={`relative flex min-w-0 items-center gap-3 rounded-xl border p-3 ${item.type === "unit" && !item.parentId ? "border-teal-200 bg-teal-50/80" : "ml-5 border-slate-200 bg-white sm:ml-10"}`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${item.type === "unit" && !item.parentId ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  {item.parentId && (
                    <p className="mb-1 text-[11px] font-medium text-slate-400">
                      {data.items.find((parent) => parent.id === item.parentId)?.title}
                    </p>
                  )}
                  <b
                    className={`break-words ${item.type === "unit" && !item.parentId ? "text-base text-teal-950" : "text-sm"}`}
                  >
                    {item.title}
                  </b>
                  <p
                    className={`mt-1 text-xs ${item.type === "unit" && !item.parentId ? "font-bold text-teal-700" : "text-slate-500"}`}
                  >
                    {item.type === "unit" && !item.parentId
                      ? "單元大綱"
                      : itemTypeLabels[item.type]}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        {!data.items.length && (
          <div className="py-12 text-center text-sm text-slate-500">
            尚未建立教材項目，請從上方新增第一筆內容。
          </div>
        )}
      </Card>
    </>
  );
}
