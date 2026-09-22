import Link from "next/link";
import { BookMarked, BookOpenCheck, ChartNoAxesCombined, UserRound } from "lucide-react";

export type StudentDetailSection = "overview" | "sessions" | "assessments" | "plans";

const sections = [
  { id: "overview", label: "個人資料", icon: UserRound },
  { id: "sessions", label: "課堂紀錄", icon: BookMarked },
  { id: "assessments", label: "考試紀錄", icon: ChartNoAxesCombined },
  { id: "plans", label: "修課進度", icon: BookOpenCheck },
] as const;

export function StudentDetailMenu({
  activeSection,
  studentId,
  classId,
  canViewPlans,
}: {
  activeSection: StudentDetailSection;
  studentId: string;
  classId?: string;
  canViewPlans: boolean;
}) {
  const visibleSections = canViewPlans
    ? sections
    : sections.filter((section) => section.id !== "plans");
  return (
    <nav
      aria-label="學生個人頁功能"
      className="flex min-w-0 gap-1 overflow-x-auto border-b bg-white px-3 pt-2"
    >
      {visibleSections.map((section) => {
        const Icon = section.icon;
        const query = new URLSearchParams({ tab: section.id });
        if (classId) query.set("classId", classId);
        const isActive = section.id === activeSection;
        return (
          <Link
            key={section.id}
            href={`/students/${studentId}?${query.toString()}`}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex min-w-max items-center gap-2 px-4 py-3 text-sm font-bold transition-colors focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${isActive ? "text-brand" : "text-slate-500 hover:text-slate-900"}`}
          >
            <Icon aria-hidden="true" size={16} />
            {section.label}
            {isActive && (
              <span className="bg-brand absolute inset-x-3 bottom-0 h-0.5 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
