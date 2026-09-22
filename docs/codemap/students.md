# 學生與學習紀錄 Code Map

## 路由

| URL | 主要用途 | 入口／畫面 |
|---|---|---|
| `/progress` | 全體學生進度 | `frontend/src/app/(dashboard)/progress/page.tsx`、`components/views/progress-view.tsx` |
| `/students` | 總名單與班級篩選名單 | `frontend/src/app/(dashboard)/students/page.tsx`、`features/students/components/students-view.tsx` |
| `/students/[studentId]` | 個人資料、考試與修課計畫 | `frontend/src/app/(dashboard)/students/[studentId]/page.tsx`、`features/student-profile/components/` |
| `/students/[studentId]?tab=sessions` | 每次課堂的出席、內容、範圍、成績與評語 | `features/student-profile/components/student-session-history.tsx` |

## 資料與行為

| 責任 | 主要位置 |
|---|---|
| 學生名單查詢型別與 UI | `frontend/src/features/students/` |
| 學生新增／名單設定 UI | `frontend/src/features/students/components/student-roster-editor.tsx` |
| 學生封存／恢復 UI | `frontend/src/features/students/components/student-lifecycle-control.tsx` |
| 學生新增、主檔、狀態與班級歸屬寫入 | `frontend/src/app/actions/student-roster-actions.ts`、`frontend/src/server/services/student-roster-service.ts` |
| 組織／班級／搜尋／狀態查詢 | `frontend/src/server/repositories/student-roster.ts`、`student-roster-core.ts` |
| 個人頁 Client-safe contracts | `frontend/src/features/student-profile/student-profile.types.ts` |
| 個人摘要／聯絡資料／考試紀錄 UI | `frontend/src/features/student-profile/components/student-profile-hero.tsx`、`student-profile-contact.tsx`、`student-assessment-history.tsx` |
| 個人頁查詢與轉換 | `frontend/src/server/repositories/student-detail.ts`、`student-detail-core.ts` |
| 個人資料／考試寫入規則 | `frontend/src/server/services/student-detail-service.ts` |
| 個人頁 Server Actions | `frontend/src/app/actions/student-detail-actions.ts` |
| 課堂進度／考卷成績 CSV 匯出 | `frontend/src/features/student-profile/components/student-report-downloads.tsx`、`student-report-export.ts` |
| 學生與課堂紀錄假資料 | `frontend/src/server/data/mock/student-profile.ts` |
| 班級今日課堂產生的課堂進度歷史 | `frontend/src/server/data/mock/class-sessions.ts`，由 `student-detail.ts` 合併至個人課堂紀錄 |
| 共用學生、班級、進度假資料 | `frontend/src/server/data/mock/fixtures.ts`、`relations.ts` |

學生與班級是多對多關係。`students` 不保存單一 `className`；班級名單由 `enrollments` 的 `studentId` 與 `classId` 組合。總名單同一學生只出現一次，但可以顯示多個班級標籤。

課堂紀錄資料流：`student-profile.ts` → `student-detail-core.ts` → `StudentDetailView.sessions` → `student-session-history.tsx`。

## 主要測試

- `relations.test.ts`：學生、班級與 Enrollment 關聯完整性。
- `student-roster-core.test.ts`：組織隔離、班級 JOIN、多班歸屬與空結果。
- `student-filters.test.tsx`：URL 篩選保留與分頁重設。
- `students-view.test.tsx`：班級情境、多班標籤與空狀態。
- `student-roster-service.test.ts`：新增學生、學號唯一性、名單管理權限與 Enrollment。
- 學生狀態分成 `active`、`leave`、`archived`；封存保留原因、時間與執行者，恢復時先回到停課且不自動入班。
- `student-detail-core.test.ts`、`student-detail-service.test.ts`：個人資料、成績與課堂紀錄規則。

相關需求：`openspec/changes/add-student-profile-and-assessment-history/`。
