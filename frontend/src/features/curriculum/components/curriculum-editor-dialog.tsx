"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function CurriculumEditorDialog({
  title,
  onClose,
  children,
  isPending = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  isPending?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        if (isPending) event.preventDefault();
        else onClose();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-slate-950/50"
    >
      <header className="flex items-center justify-between gap-3 border-b p-4 sm:p-6">
        <h2 id={titleId} className="min-w-0 text-lg font-bold break-words">
          {title}
        </h2>
        <button
          type="button"
          disabled={isPending}
          onClick={onClose}
          aria-label={`關閉${title}`}
          className="shrink-0 rounded-lg p-2 hover:bg-slate-100"
        >
          <X size={20} />
        </button>
      </header>
      <div className="min-w-0 p-4 sm:p-6">{children}</div>
    </dialog>
  );
}
