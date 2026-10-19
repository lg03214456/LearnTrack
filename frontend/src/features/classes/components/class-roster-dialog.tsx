"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Users, X } from "lucide-react";
import type { ClassRosterView } from "../class-management.types";

const statusLabels = { active: "在籍", leave: "留停" } as const;

export function ClassRosterDialog({
  view,
  onClose,
}: {
  view: ClassRosterView;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [search, setSearch] = useState("");
  const visibleStudents = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase();
    if (!keyword) return view.students;
    return view.students.filter(
      (student) =>
        student.name.toLocaleLowerCase().includes(keyword) ||
        student.number.toLocaleLowerCase().includes(keyword),
    );
  }, [search, view.students]);

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
        aria-labelledby="class-roster-dialog-title"
        className="flex h-dvh min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-wide text-teal-700">{view.classCode}</p>
            <h2 id="class-roster-dialog-title" className="mt-1 truncate text-xl font-extrabold">
              {view.className}・學生名單
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              共 {view.students.length} 位
              {view.capacity ? `，人數上限 ${view.capacity} 位` : "，無人數上限"}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="關閉班級學生名單"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            <X size={20} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <label className="relative block">
            <span className="sr-only">搜尋班級學生</span>
            <Search
              aria-hidden="true"
              size={17}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input w-full pl-10"
              placeholder="搜尋姓名或學號"
            />
          </label>
          <div className="mt-4 space-y-2">
            {visibleStudents.map((student) => (
              <Link
                key={student.id}
                href={`/students/${student.id}?classId=${encodeURIComponent(view.classId)}`}
                aria-label={`查看${student.name}個人資料`}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-teal-300 hover:bg-teal-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                <span className="rounded-full bg-teal-50 p-2 text-teal-700">
                  <Users size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{student.name}</p>
                  <p className="truncate text-xs text-slate-500">{student.number}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {statusLabels[student.status]}
                </span>
              </Link>
            ))}
            {!visibleStudents.length && (
              <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                {view.students.length ? "沒有符合搜尋條件的學生" : "此班級目前尚無學生"}
              </p>
            )}
          </div>
        </div>
        <footer className="flex shrink-0 justify-end border-t px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border px-4 py-2.5 text-sm font-bold sm:w-auto"
          >
            關閉
          </button>
        </footer>
      </section>
    </div>
  );
}
