import { BookMarked, CalendarDays, CheckCircle2, Clock3, MessageSquareText } from "lucide-react";
import type { CourseSessionView } from "../student-profile.types";
import { SessionReportDownload } from "./student-report-downloads";

const attendanceLabels = { present: "出席", late: "遲到", absent: "缺席", leave: "請假" } as const;
const attendanceStyles = {
  present: "bg-emerald-50 text-emerald-700",
  late: "bg-amber-50 text-amber-700",
  absent: "bg-red-50 text-red-700",
  leave: "bg-slate-100 text-slate-600",
} as const;

export function StudentSessionHistory({
  studentName,
  studentId,
  sessions,
}: {
  studentName: string;
  studentId?: string;
  sessions: CourseSessionView[];
}) {
  return (
    <section aria-labelledby="session-history-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-brand text-xs font-bold tracking-wide">CLASS SESSION HISTORY</p>
          <h2 id="session-history-heading" className="mt-1 text-lg font-bold">
            每次課堂完成進度
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            按上課日期查看出席、課程內容、完成範圍與課堂回饋。
          </p>
        </div>
        <span className="bg-brand-soft text-brand pill">共 {sessions.length} 次課堂</span>
      </div>
      <div className="mt-4">
        <SessionReportDownload
          studentId={studentId}
          studentName={studentName}
          sessions={sessions}
        />
      </div>
      <div className="mt-5 space-y-3">
        {sessions.map((session) => (
          <article
            key={session.id}
            className="hover:border-brand/30 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-colors md:grid-cols-[9rem_minmax(0,1fr)_10rem]"
          >
            <div>
              <p className="flex items-center gap-2 text-sm font-bold">
                <CalendarDays className="text-brand" size={16} />
                {session.date}
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${attendanceStyles[session.attendance]}`}
              >
                {attendanceLabels[session.attendance]}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400">
                {session.className}・{session.subject}
              </p>
              <h3 className="mt-1 font-bold text-slate-900">{session.content}</h3>
              <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={15} />
                {session.progress}
              </p>
              {session.comment && (
                <p className="mt-2 flex items-start gap-2 text-xs text-slate-500">
                  <MessageSquareText className="mt-0.5 shrink-0" size={14} />
                  {session.comment}
                </p>
              )}
              {session.supersedesId && (
                <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                  更正紀錄：{session.correctionReason}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t pt-3 md:block md:border-t-0 md:border-l md:pt-0 md:pl-4">
              <p className="text-xs text-slate-400">課堂成績</p>
              <p className="text-brand mt-1 text-xl font-bold">
                {session.score === null ? "—" : `${session.score} 分`}
              </p>
              <p className="mt-2 hidden items-center gap-1 text-xs text-slate-400 md:flex">
                <Clock3 size={13} />
                完成紀錄
              </p>
            </div>
          </article>
        ))}
      </div>
      {!sessions.length && (
        <div className="mt-5 rounded-xl border border-dashed p-10 text-center">
          <BookMarked className="mx-auto text-slate-300" size={30} />
          <p className="mt-3 font-bold">尚無課堂紀錄</p>
          <p className="mt-1 text-sm text-slate-500">完成第一次課堂登記後會顯示在這裡。</p>
        </div>
      )}
    </section>
  );
}
