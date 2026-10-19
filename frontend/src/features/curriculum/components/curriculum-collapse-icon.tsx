import { ChevronDown } from "lucide-react";

export function CurriculumCollapseIcon() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 group-hover:bg-slate-50">
      <ChevronDown
        size={22}
        strokeWidth={2.5}
        aria-hidden="true"
        className="transition-transform group-open:rotate-180"
      />
    </span>
  );
}
