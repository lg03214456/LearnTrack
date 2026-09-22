"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { AssessmentResultView, CourseSessionView } from "../student-profile.types";
import { buildAssessmentCsv, buildSessionCsv, downloadCsv } from "../student-report-export";
import { auditStudentExportAction } from "@/app/actions/export-actions";

const safeFilename = (value: string) => value.replace(/[\\/:*?"<>|]/g, "-");

export function SessionReportDownload({
  studentName,
  studentId,
  sessions,
}: {
  studentName: string;
  studentId?: string;
  sessions: CourseSessionView[];
}) {
  const [classId, setClassId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const classes = useMemo(
    () => [...new Map(sessions.map((session) => [session.classId, session.className])).entries()],
    [sessions],
  );
  const filteredSessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          (!classId || session.classId === classId) &&
          (!startDate || session.date >= startDate) &&
          (!endDate || session.date <= endDate),
      ),
    [classId, endDate, sessions, startDate],
  );

  return (
    <div className="border-brand/15 bg-brand-soft/45 flex flex-wrap items-end gap-2 rounded-xl border p-3">
      <label className="text-xs font-medium text-slate-600">
        班級維度
        <select
          className="input mt-1 block"
          value={classId}
          onChange={(event) => setClassId(event.target.value)}
        >
          <option value="">全部班級</option>
          {classes.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600">
        開始日期
        <input
          aria-label="課堂進度開始日期"
          className="input mt-1 block"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
      </label>
      <label className="text-xs font-medium text-slate-600">
        結束日期
        <input
          aria-label="課堂進度結束日期"
          className="input mt-1 block"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={!filteredSessions.length}
        onClick={async () => {
          if (
            studentId &&
            !(await auditStudentExportAction(studentId, "sessions", filteredSessions.length))
          )
            return;
          downloadCsv(
            `${safeFilename(studentName)}-課堂進度.csv`,
            buildSessionCsv(studentName, filteredSessions),
          );
        }}
        className="bg-brand hover:bg-brand-deep inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Download aria-hidden="true" size={16} />
        下載課堂進度（{filteredSessions.length}）
      </button>
    </div>
  );
}

export function AssessmentReportDownload({
  studentName,
  studentId,
  rows,
}: {
  studentName: string;
  studentId?: string;
  rows: AssessmentResultView[];
}) {
  return (
    <button
      type="button"
      disabled={!rows.length}
      onClick={async () => {
        if (studentId && !(await auditStudentExportAction(studentId, "assessments", rows.length)))
          return;
        downloadCsv(
          `${safeFilename(studentName)}-考卷成績.csv`,
          buildAssessmentCsv(studentName, rows),
        );
      }}
      className="bg-brand hover:bg-brand-deep inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download aria-hidden="true" size={16} />
      下載考卷成績（{rows.length}）
    </button>
  );
}
