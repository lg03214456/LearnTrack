import { BookOpen } from "lucide-react";
import type { SelectedClassContext } from "../student-roster.types";

export function SelectedClassBanner({ selectedClass }: { selectedClass: SelectedClassContext }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
      <BookOpen size={17} />
      <span>目前顯示：</span>
      <strong>{selectedClass.name}</strong>
    </div>
  );
}
