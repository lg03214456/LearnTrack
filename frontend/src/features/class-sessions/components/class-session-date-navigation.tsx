"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

export function ClassSessionDateNavigation({
  classId,
  date,
  actions,
  children,
}: {
  classId: string;
  date: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDateChange(nextDate: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate) || nextDate === date) return;
    startTransition(() => {
      router.push(`/classes/${encodeURIComponent(classId)}?date=${encodeURIComponent(nextDate)}`, {
        scroll: false,
      });
    });
  }

  return (
    <section aria-label="課堂日期與紀錄" aria-busy={isPending}>
      <fieldset disabled={isPending} className="min-w-0">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
            <label className="flex w-full flex-col gap-2 text-sm font-bold text-slate-600 sm:w-52">
              <span>課堂日期</span>
              <input
                className="input min-w-0"
                type="date"
                name="date"
                value={date}
                onChange={(event) => {
                  if (event.currentTarget.validity.valid)
                    handleDateChange(event.currentTarget.value);
                }}
              />
            </label>
            {isPending && (
              <span role="status" className="flex items-center gap-2 py-2 text-sm text-slate-600">
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                正在載入課堂…
              </span>
            )}
          </div>
          {actions}
        </div>
        <div className={isPending ? "pointer-events-none opacity-50" : undefined}>{children}</div>
      </fieldset>
    </section>
  );
}
