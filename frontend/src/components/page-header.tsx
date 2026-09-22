import Link from "next/link";
import { ChevronRight } from "lucide-react";
interface BreadcrumbItem {
  label: string;
  href?: string;
}
interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  breadcrumbs?: BreadcrumbItem[];
}
export function PageHeader({ eyebrow, title, description, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="page-enter mb-7">
      {breadcrumbs?.length ? (
        <nav aria-label="頁面路徑" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
          {breadcrumbs.map((item, index) => {
            const isCurrent = index === breadcrumbs.length - 1;
            return (
              <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight size={13} className="text-slate-300" aria-hidden="true" />
                )}
                {item.href && !isCurrent ? (
                  <Link
                    href={item.href}
                    className="rounded-md px-1.5 py-1 font-bold text-slate-500 hover:bg-teal-50 hover:text-teal-800"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isCurrent ? "page" : undefined}
                    className="px-1.5 py-1 font-bold text-amber-700"
                  >
                    {item.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      ) : null}
      {!breadcrumbs?.length && (
        <div className="text-xs font-bold tracking-wide text-amber-700">{eyebrow}</div>
      )}
      <h1 className="mt-1 text-[clamp(1.65rem,2.5vw,2.15rem)] leading-tight font-extrabold tracking-[-0.025em]">
        {title}
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
