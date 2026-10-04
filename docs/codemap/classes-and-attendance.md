# 班級與出缺席 Code Map

## 路由

| URL | 主要用途 | 入口／畫面 |
|---|---|---|
| `/classes` | 班級總覽、快速操作與新增班級對話框 | `frontend/src/app/(dashboard)/classes/page.tsx`、`components/views/classes-view.tsx`、`features/classes/components/class-create-dialog.tsx` |
| `/classes/new` | 建立班級的相容入口；班級總覽預設改由對話框建立 | `frontend/src/app/(dashboard)/classes/new/page.tsx`、`features/classes/components/class-editor.tsx` |
| `/classes/[classId]/edit` | 編輯、封存、入退班 | `frontend/src/app/(dashboard)/classes/[classId]/edit/page.tsx`、`features/classes/components/class-editor.tsx` |
| `/classes/[classId]?date=YYYY-MM-DD` | 今日課堂與班級成員個別教材進度 | `frontend/src/app/(dashboard)/classes/[classId]/page.tsx`、`features/class-sessions/components/class-daily-workspace.tsx` |
| `/attendance` | 每日點名與統計 | `frontend/src/app/(dashboard)/attendance/page.tsx`、`components/views/attendance-view.tsx` |

班級卡片的「查看學生名單」導向 `/students?classId=<id>`，由學生名單 Repository 執行班級篩選；不要建立另一份獨立學生清單資料。

## 資料與行為

| 責任 | 主要位置 |
|---|---|
| 班級 UI 與 Client-safe contracts | `frontend/src/features/classes/` |
| 班級總覽、編輯選項、每日應到查詢 | `frontend/src/server/repositories/class-management.ts`、`class-management-supabase.ts` |
| 建立、更新、容量、入退班、生命週期 | `frontend/src/server/services/class-management-service.ts` |
| 班級 Server Actions | `frontend/src/app/actions/class-management-actions.ts` |
| 可重設的班級假資料 | `frontend/src/server/data/mock/class-management.ts`，只供 Mock provider／測試使用 |
| Enrollment 關聯 | `frontend/src/server/data/mock/relations.ts` |
| 課堂、成員快照與學生進度歷史 | `frontend/src/server/data/mock/class-sessions.ts` |
| 今日課堂 JOIN 與 View Model | `frontend/src/server/repositories/class-session.ts`、`class-session-core.ts` |
| 課堂進度權限、原子批次與更正 | `frontend/src/server/services/class-session-service.ts` |
| 課堂進度 Server Actions | `frontend/src/app/actions/class-session-actions.ts` |
| 點名 Client-safe contracts | `frontend/src/features/attendance/attendance.types.ts` |
| 指定日期／班級點名 View Model | `frontend/src/server/repositories/attendance.ts`、`attendance-core.ts` |
| 班級基本資料欄位 | `frontend/src/features/classes/components/class-basic-fields.tsx` |
| 機構科目目錄與班級自動編碼 | `frontend/supabase/migrations/202610050001_subject_catalog_and_automatic_class_codes.sql`、`frontend/src/server/repositories/class-management-supabase.ts` |
| 每週排課欄位 | `frontend/src/features/classes/components/class-schedule-fields.tsx` |
| 初始學生選擇 | `frontend/src/features/classes/components/class-student-selector.tsx` |

## 主要測試

- `classes-view.test.tsx`：班級卡片前往篩選名單的穩定網址。
- `attendance-view.test.tsx`：點名狀態與統計即時更新。
- `attendance-core.test.ts`：日期班級 View Model、跨班去重與既有點名狀態 JOIN。
- `class-management.test.ts`：班級 JOIN、權限範圍、編輯 View Model、每日應到名單。
- `class-management-service.test.ts`：建立、revision、容量、入退班與生命週期。
- `class-management-actions.test.ts`：FormData、錯誤保留、revalidate 與 redirect。
- `class-session*.test.*`：混齡／多版本 JOIN、課堂名單快照、範圍權限、原子寫入、多教材 UI 與更正留痕。

班級不保存教材版本。今日課堂只以 Enrollment 建立當次成員快照，再依每位學生自己的 active Study Plan 取得教材與學習項目；`本次不更新` 不產生進度紀錄。

草稿課堂以一個批次按鈕統一更新所有畫面暫存進度。完成課堂若有漏登，可批次新增進度並填寫一次補登原因；後端 append `StudentSessionProgress`，不覆蓋既有歷史。既有紀錄內容錯誤則維持逐筆 successor 更正。
