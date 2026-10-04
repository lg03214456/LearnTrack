"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { ClassEditorView } from "../class-management.types";
import { ClassEditor } from "./class-editor";

export function ClassEditorDialog({
  view,
  onClose,
}: {
  view: ClassEditorView;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isCreating = view.mode === "create";
  const title = isCreating ? "新增班級" : "編輯班級";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid items-stretch bg-slate-950/50 sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-editor-dialog-title"
        className="flex h-dvh min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-5xl sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-wide text-teal-700">課程班級</p>
            <h2 id="class-editor-dialog-title" className="mt-1 text-xl font-extrabold">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              設定基本資料、排課時段、授課教師與學生名單。
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={`關閉${title}對話框`}
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            <X size={20} />
          </button>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 sm:p-6">
          <ClassEditor view={view} onCancel={onClose} returnTo="/classes" />
        </div>
      </section>
    </div>
  );
}
