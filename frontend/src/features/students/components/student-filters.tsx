"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ListStudentsQuery, StudentClassOption } from "../student-roster.types";

interface StudentFiltersProps {
  query: ListStudentsQuery;
  classOptions: StudentClassOption[];
}

function buildStudentListUrl(currentParams: string, updates: Record<string, string | undefined>) {
  const params = new URLSearchParams(currentParams);
  for (const [key, value] of Object.entries(updates)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  params.delete("page");
  return `/students${params.size ? `?${params.toString()}` : ""}`;
}

export function StudentFilters({ query, classOptions }: StudentFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentParams = searchParams.toString();
  const [search, setSearch] = useState(query.search ?? "");

  useEffect(() => {
    if (search === (query.search ?? "")) return;
    const timer = window.setTimeout(() => {
      router.replace(buildStudentListUrl(currentParams, { search: search || undefined }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [currentParams, query.search, router, search]);

  function navigate(updates: Record<string, string | undefined>) {
    router.push(buildStudentListUrl(currentParams, updates));
  }

  return (
    <div className="flex flex-wrap gap-3 p-4" aria-label="學生名單篩選">
      <input
        aria-label="搜尋學生"
        className="input min-w-64 flex-1"
        placeholder="搜尋學生姓名或學號..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <select
        aria-label="班級篩選"
        className="input"
        value={query.classId ?? ""}
        onChange={(event) => navigate({ classId: event.target.value || undefined })}
      >
        <option value="">全部班級</option>
        {classOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <select
        aria-label="狀態篩選"
        className="input"
        value={query.status ?? ""}
        onChange={(event) => navigate({ status: event.target.value || undefined })}
      >
        <option value="">在籍與停課</option>
        <option value="active">在籍</option>
        <option value="leave">停課中</option>
        <option value="archived">已封存</option>
      </select>
    </div>
  );
}
