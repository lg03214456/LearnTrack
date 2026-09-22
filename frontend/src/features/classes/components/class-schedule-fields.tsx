import { Plus, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Card } from "@/components/ui";
import type { ClassCommandResult, WeeklyScheduleSlot } from "../class-management.types";

const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

export function ClassScheduleFields({
  schedules,
  setSchedules,
  fieldErrors,
}: {
  schedules: WeeklyScheduleSlot[];
  setSchedules: Dispatch<SetStateAction<WeeklyScheduleSlot[]>>;
  fieldErrors?: ClassCommandResult["fieldErrors"];
}) {
  const updateSchedule = (index: number, patch: Partial<WeeklyScheduleSlot>) =>
    setSchedules((current) =>
      current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...patch } : slot)),
    );
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">每週排課</h2>
          <p className="text-xs text-slate-500">可建立多筆固定時段。</p>
        </div>
        <button
          type="button"
          onClick={() =>
            setSchedules((current) => [
              ...current,
              { weekday: 1, startTime: "18:30", endTime: "20:30", room: "" },
            ])
          }
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold"
        >
          <Plus size={15} />
          新增時段
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {schedules.map((slot, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-xl border p-3 md:grid-cols-[8rem_1fr_1fr_1fr_auto]"
          >
            <select
              aria-label={`時段 ${index + 1} 星期`}
              value={slot.weekday}
              onChange={(event) => updateSchedule(index, { weekday: Number(event.target.value) })}
              className="input"
            >
              {weekdays.map((weekday, weekdayIndex) => (
                <option key={weekdayIndex} value={weekdayIndex}>
                  星期{weekday}
                </option>
              ))}
            </select>
            <input
              aria-label={`時段 ${index + 1} 開始時間`}
              type="time"
              value={slot.startTime}
              onChange={(event) => updateSchedule(index, { startTime: event.target.value })}
              className="input"
            />
            <input
              aria-label={`時段 ${index + 1} 結束時間`}
              type="time"
              value={slot.endTime}
              onChange={(event) => updateSchedule(index, { endTime: event.target.value })}
              className="input"
            />
            <input
              aria-label={`時段 ${index + 1} 教室`}
              placeholder="教室（選填）"
              value={slot.room}
              onChange={(event) => updateSchedule(index, { room: event.target.value })}
              className="input"
            />
            <button
              type="button"
              aria-label={`刪除時段 ${index + 1}`}
              onClick={() =>
                setSchedules((current) => current.filter((_, slotIndex) => slotIndex !== index))
              }
              className="grid size-10 place-items-center rounded-lg border text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <small className="text-red-600">{fieldErrors?.schedules}</small>
    </Card>
  );
}
