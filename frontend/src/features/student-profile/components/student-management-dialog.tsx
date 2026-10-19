"use client";

import { useEffect, useId, useRef, useState, type PropsWithChildren } from "react";
import { FilePenLine, X } from "lucide-react";

export function StudentManagementDialog({
  title,
  description,
  children,
  triggerLabel,
}: PropsWithChildren<{ title: string; description: string; triggerLabel?: string }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [isOpen]);

  return (
    <div
      className={triggerLabel ? "min-w-0" : "min-w-0 rounded-xl border border-slate-200 bg-white"}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          triggerLabel
            ? "flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-bold text-teal-800 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-700"
            : "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-700"
        }
      >
        <FilePenLine size={18} className="shrink-0 text-teal-700" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block text-sm font-bold break-words">{triggerLabel ?? title}</span>
          {!triggerLabel && (
            <span className="mt-1 block text-xs text-slate-500">{description}</span>
          )}
        </span>
      </button>
      {isOpen && (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onCancel={() => setIsOpen(false)}
          onClose={() => setIsOpen(false)}
          className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-slate-950/50"
        >
          <header className="flex items-start justify-between gap-3 border-b p-4 sm:p-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-bold break-words">
                {title}
              </h2>
              <p id={descriptionId} className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            </div>
            <button
              type="button"
              aria-label={`關閉${title}`}
              onClick={() => setIsOpen(false)}
              className="shrink-0 rounded-lg p-2 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              <X size={20} />
            </button>
          </header>
          <div className="min-w-0 p-4 sm:p-6">{children}</div>
          <footer className="flex justify-end border-t p-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm font-bold"
            >
              關閉
            </button>
          </footer>
        </dialog>
      )}
    </div>
  );
}
