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
| 今日課堂 provider、Supabase RPC 與 Mock View Model | `frontend/src/server/repositories/class-session.ts`、`class-session-supabase.ts`、`class-session-core.ts` |
| 課堂進度 provider service／Mock 業務規則 | `frontend/src/server/services/class-session-persistence-service.ts`、`class-session-service.ts` |
| 今日課堂原子交易、名單快照、revision 與歷史防覆寫 | `frontend/supabase/migrations/202610100001_class_session_functions.sql` |
| 課堂進度 Server Actions | `frontend/src/app/actions/class-session-actions.ts` |
| 課堂日期自動切換、transition 載入與操作鎖定 | `frontend/src/features/class-sessions/components/class-session-date-navigation.tsx` |
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

Supabase 模式下只讀取真正的 `study_plans` 與 `student_learning_items`，不把記憶體計畫混入資料庫課堂。教材與計畫編輯 adapter 尚未整體切換；若計畫只建在 Mock，今日課堂會呈現尚未設定教材。`/attendance` 的編輯器接線仍是獨立待辦，不能因今日課堂顯示資料庫出勤就視為點名儲存已完成。

今日課堂主要入口為「學生進度」姓名按鈕：`student-progress-checklist-dialog.tsx` 按學生 active plan/version 分組，既有 completed 項目 readonly，`progress-checklist.ts` 只把新勾選項目組成 completed entries。確認直接走原 audited save/append action；成功 refresh，不合成 revision，不需第二次批次儲存。取消不寫入，conflict／uncertain 需重新載入確認。詳見 `frontend/docs/class-progress-checklist-verification.md`。

依使用者後續確認，今日課堂不再掛載「進階登記／統一更新課堂進度」，只保留姓名勾選後直接確認儲存。舊 batch component／actions 暫保留相容性，未刪除後端或任何紀錄。完成課堂漏登仍填補登原因並 append `StudentSessionProgress`，既有紀錄內容錯誤維持逐筆 successor 更正。

今日課堂「課堂點名」由 `class-attendance-dialog.tsx` 開啟四種單選狀態，透過 `class-attendance-actions.ts` → `class-attendance-service.ts` → `class-attendance.ts`／`class-attendance-mock.ts` 儲存。權限獨立使用 attendance.read/manage；未變更者不送出，不會預設全員出席。遲到可選填實際到課時間（課堂日期＋Asia/Taipei），不同於伺服器登記時間。更正或已完成課堂補登須填原因；原子交易驗證 lesson revision／previousRecordId 並 append successor。調課仍未實作，不會自動歸為請假／缺席。

`202610190001_class_attendance_and_history.sql` 增加 arrived_at 與兩個 user-JWT RPC，撤銷 attendance 直表寫入權限，保留 RLS SELECT 和 append-only trigger。缺少此 migration 時仍讀原本真實 progress RPC，但點名停用並明確提示，不 fallback Mock。`session-history.ts` 依 studentId、studyPlanId/versionId 分組，以 student_learning_items.position 排序、保留更正鏈；時間只顯示不排序。詳見 `frontend/docs/class-attendance-verification.md`。
