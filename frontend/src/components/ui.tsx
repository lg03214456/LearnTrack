import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
export function Card({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <section className={clsx("card", className)}>{children}</section>;
}
export function Button({
  children,
  className,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "bg-brand hover:bg-brand-deep rounded-lg px-4 py-2 text-sm font-bold text-white",
        className,
      )}
      {...p}
    >
      {children}
    </button>
  );
}
export function Metric({
  label,
  value,
  sub,
  icon: Icon,
  tone = "teal",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  tone?: string;
}) {
  const bg =
    tone === "red"
      ? "bg-red-50 text-red-600"
      : tone === "blue"
        ? "bg-blue-50 text-blue-600"
        : "bg-teal-50 text-teal-700";
  return (
    <Card className="flex min-h-28 items-center gap-4 p-5">
      <div className={clsx("rounded-full p-3", bg)}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {sub && <div className="mt-1 text-xs text-emerald-600">{sub}</div>}
      </div>
    </Card>
  );
}
export function ProgressBar({ value, color = "var(--brand)" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded bg-slate-200">
      <div className="h-full rounded" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}
export const statusText = {
  ahead: "超前進度",
  normal: "穩定正常",
  behind: "需要關注",
  active: "在籍",
  leave: "停課中",
  archived: "已封存",
  present: "出席",
  late: "遲到",
  absent: "缺席",
} as Record<string, string>;
export function Status({ value }: { value: string }) {
  const style =
    value === "ahead" || value === "active" || value === "present"
      ? "bg-emerald-50 text-emerald-700"
      : value === "normal"
        ? "bg-blue-50 text-blue-700"
        : value === "archived"
          ? "bg-slate-100 text-slate-600"
          : value === "late"
            ? "bg-amber-50 text-amber-700"
            : "bg-red-50 text-red-600";
  return (
    <span className={clsx("pill", style)}>
      <i className="dot" />
      {statusText[value] ?? value}
    </span>
  );
}
