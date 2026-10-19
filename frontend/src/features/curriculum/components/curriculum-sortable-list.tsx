"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookOpen, ChevronRight, GripVertical, Pencil, Trash2 } from "lucide-react";
import { reorderTemplateItemsAction } from "@/app/actions/curriculum-actions";
import type { CurriculumDetail, TemplateItemType, TemplateItemView } from "../curriculum.types";
import { CurriculumItemEditor } from "./curriculum-item-editor";
import { CurriculumItemDeleteDialog } from "./curriculum-item-delete-dialog";

const itemTypeLabels: Record<TemplateItemType, string> = {
  chapter: "章節",
  unit: "單元",
  material: "教材",
  worksheet: "講義／練習",
  assessment: "考卷／測驗",
};

export function resolvePersistedOrder<T>(result: { ok: boolean }, next: T[], previous: T[]) {
  return result.ok ? next : previous;
}

function SortableRow({
  item,
  index,
  isPending,
  parentTitle,
  onOpenDialog,
}: {
  item: TemplateItemView;
  index: number;
  isPending: boolean;
  parentTitle?: string;
  onOpenDialog: (mode: "edit" | "delete", item: TemplateItemView) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isPending,
  });
  const isUnit = item.type === "unit" && !item.parentId;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-level={isUnit ? "unit" : "content"}
      className={`flex min-w-0 flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center ${isUnit ? "border-teal-200 bg-teal-50/80 shadow-sm" : "ml-5 border-slate-200 bg-white before:absolute before:top-1/2 before:-left-4 before:h-px before:w-4 before:bg-slate-300 sm:ml-10"} relative ${isDragging ? "z-10 border-teal-500 shadow-lg" : ""}`}
    >
      <button
        type="button"
        aria-label={`拖曳「${item.title}」調整順序`}
        title="拖曳調整順序；鍵盤可按空白鍵開始"
        disabled={isPending}
        className="grid size-9 shrink-0 touch-none place-items-center rounded-lg border border-dashed text-slate-400 hover:border-teal-600 hover:text-teal-700 disabled:opacity-40"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={17} />
      </button>
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${isUnit ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500"}`}
      >
        {isUnit ? <BookOpen size={16} aria-hidden="true" /> : index + 1}
      </span>
      <div className="min-w-0 flex-1">
        {parentTitle && (
          <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-slate-400">
            <ChevronRight size={12} aria-hidden="true" /> {parentTitle}
          </p>
        )}
        <b className={`break-words ${isUnit ? "text-base text-teal-950" : "text-sm"}`}>
          {item.title}
        </b>
        <p className={`mt-1 text-xs ${isUnit ? "font-bold text-teal-700" : "text-slate-500"}`}>
          {isUnit ? "單元大綱" : itemTypeLabels[item.type]}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onOpenDialog("edit", item)}
          aria-label={`編輯「${item.title}」`}
          className="grid size-9 place-items-center rounded-lg border text-teal-700 hover:bg-teal-50 disabled:opacity-50"
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => onOpenDialog("delete", item)}
          aria-label={`刪除「${item.title}」`}
          className="grid size-9 place-items-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

export function CurriculumSortableList({ data }: { data: CurriculumDetail }) {
  const router = useRouter(),
    [orderedItems, setOrderedItems] = useState(data.items),
    [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null),
    [isPending, startTransition] = useTransition();
  const [activeDialog, setActiveDialog] = useState<{
    mode: "edit" | "delete";
    item: TemplateItemView;
  } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (isPending || !over || active.id === over.id) return;
    const oldIndex = orderedItems.findIndex((item) => item.id === active.id),
      newIndex = orderedItems.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const previous = orderedItems,
      next = arrayMove(orderedItems, oldIndex, newIndex);
    setOrderedItems(next);
    setFeedback(null);
    startTransition(async () => {
      const result = await reorderTemplateItemsAction({
        versionId: data.versionId,
        orderedItemIds: next.map((item) => item.id),
        revision: data.revision,
      });
      setFeedback(result);
      setOrderedItems(resolvePersistedOrder(result, next, previous));
      if (result.ok) router.refresh();
    });
  };
  return (
    <>
      <DndContext
        id={`curriculum-sortable-${data.versionId}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={orderedItems.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="mt-4 space-y-2">
            {orderedItems.map((item, index) => (
              <SortableRow
                key={item.id}
                item={item}
                index={index}
                isPending={isPending || activeDialog !== null}
                onOpenDialog={(mode, selectedItem) => setActiveDialog({ mode, item: selectedItem })}
                parentTitle={
                  orderedItems.find((candidate) => candidate.id === item.parentId)?.title
                }
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {activeDialog?.mode === "edit" && (
        <CurriculumItemEditor
          data={data}
          item={activeDialog.item}
          onClose={() => setActiveDialog(null)}
        />
      )}
      {activeDialog?.mode === "delete" && (
        <CurriculumItemDeleteDialog
          data={data}
          item={activeDialog.item}
          onClose={() => setActiveDialog(null)}
        />
      )}
      {feedback && (
        <p
          role="status"
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${feedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
        >
          {feedback.message}
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {isPending ? "正在儲存教材順序" : ""}
      </span>
    </>
  );
}

export { itemTypeLabels };
