import type { AssessmentResultView, CourseSessionView } from "./student-profile.types";

type CsvValue = string | number | null;

const escapeCsvValue = (value: CsvValue) => {
  const text = value === null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const createCsv = (rows: CsvValue[][]) =>
  `\uFEFF${rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n")}`;

export const buildSessionCsv = (studentName: string, sessions: CourseSessionView[]) =>
  createCsv([
    ["學生", "日期", "班級", "科目", "出席", "課程內容", "完成進度", "課堂成績", "老師評語"],
    ...sessions.map((session) => [
      studentName,
      session.date,
      session.className,
      session.subject,
      { present: "出席", late: "遲到", absent: "缺席", leave: "請假" }[session.attendance],
      session.content,
      session.progress,
      session.score,
      session.comment,
    ]),
  ]);

export const buildAssessmentCsv = (studentName: string, rows: AssessmentResultView[]) =>
  createCsv([
    ["學生", "日期", "學期", "科目", "考卷名稱", "得分", "滿分", "換算百分比", "老師評語"],
    ...rows.map((row) => [
      studentName,
      row.date,
      row.termId,
      row.subject,
      row.title,
      row.score,
      row.maximumScore,
      `${row.percentage}%`,
      row.comment,
    ]),
  ]);

export const downloadCsv = (filename: string, content: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
