# 教材與課程範本 Code Map

## 路由

| URL | 主要用途 | 入口／畫面 |
|---|---|---|
| `/curriculum/templates` | 教材範本與版本清單 | `frontend/src/app/(dashboard)/curriculum/templates/page.tsx`、`features/curriculum/` |
| `/curriculum/templates/[versionId]` | 版本內容、草稿編輯、發布與排序 | `frontend/src/app/(dashboard)/curriculum/templates/[versionId]/page.tsx`、`features/curriculum/components/curriculum-detail.tsx` |
| `/students/[studentId]?tab=plans` | 學生修課計畫與個人學習項目 | 詳見 [學生與學習紀錄](students.md) |

## 資料與行為

| 責任 | 主要位置 |
|---|---|
| 教材 UI 與 Client-safe contracts | `frontend/src/features/curriculum/` |
| 清單篩選／建立／範本卡片 | `frontend/src/features/curriculum/components/curriculum-filters.tsx`、`curriculum-create-form.tsx`、`curriculum-template-card.tsx` |
| 版本明細與新增項目 | `frontend/src/features/curriculum/components/curriculum-detail.tsx` |
| 拖曳／鍵盤排序、刪除與失敗回復 | `frontend/src/features/curriculum/components/curriculum-sortable-list.tsx` |
| UI 唯讀查詢邊界 | `frontend/src/server/repositories/curriculum.ts` |
| Supabase 教材／學生計畫讀寫 adapter | `frontend/src/server/repositories/curriculum-supabase.ts` |
| Provider-aware 寫入入口 | `frontend/src/server/services/curriculum-persistence-service.ts` |
| 與 Mock 解耦的領域型別 | `frontend/src/server/domain/curriculum.ts` |
| 教材與修課計畫指令、權限檢查 | `frontend/src/server/services/curriculum-service.ts` |
| 教材項目新增、編輯、排序、刪除 | `frontend/src/server/services/curriculum-item-service.ts` |
| 教材 Server Actions | `frontend/src/app/actions/curriculum-actions.ts` |
| 可重設的教材假資料 | `frontend/src/server/data/mock/curriculum.ts` |

Repository 依 `LEARNTRACK_DOMAIN_DATA_PROVIDER` 選擇 Mock／Supabase，UI 不依賴 mock store 或資料庫 row shape。Supabase 讀取呼叫 `read_curriculum_workspace`，寫入呼叫 `mutate_curriculum_workspace`；均攜帶使用者 JWT，不使用 secret key。先套用 `202610100002_curriculum_functions.sql`。拖曳排序須保留鍵盤替代操作與失敗回復。

教材內容採兩層視覺語意：`unit` 是最上層單元大綱，`chapter`、講義、練習與測驗可透過 `parentId` 歸入該單元。明細頁以主色單元卡與縮排內容列呈現，新增內容時需先選擇所屬單元；排序資料仍以同一份扁平清單儲存，避免 UI 直接依賴特定資料庫樹狀格式。

版本明細頁不顯示獨立返回按鈕，改由頁首 `教材範本 / 版本內容` 麵包屑 Tree 返回範本庫；全系統第二層頁面沿用相同導覽模式。新增教材內容則從內容清單右上角展開，讓建立、排序與刪除操作集中在同一工作區。

教材版本只綁定學生 Study Plan，不綁定班級。班級今日課堂透過 `studyPlanId + learningItemId` 更新學生項目狀態；備註是選填自由文字，不參與完成率計算。

同學期、同學生、同科目更換教材時會建立新 Study Plan。舊計畫標記 `replaced`；相同 `lineageId` 的已完成項目帶入新計畫，其他未完成項目標記 `removed`，不硬刪除歷史。Supabase replacement 函式先鎖學生與舊計畫、關閉舊 active slot，再建立新計畫與項目，避免唯一索引衝突。已發布版本不能編輯，透過「複製為新草稿」保留 lineage；被更換或移除的項目不可再由個人頁更新。

科目選項讀取機構 `subjects.code/name`。年級、出版社、學期仍是既有固定分類目錄，不是教材或學生示範資料；可設定式參考資料表仍待後續階段。教材內 assessment 項目只是課程項目，不會自動建立 `assessments` 考卷主檔或分數。

## 主要測試

學生連續設定使用 `saveStudentSetupPlanAction`，與原 redirecting `createPlanAction` 共用 audited plan service，另檢查 context、已發布版本及替換確認。`ExamRangeForm` 可內嵌於設定對話框，獨立編輯仍由原 dialog 包裝；不產生巢狀 modal。`StudentStudyPlansView` 共用卡片將 active 與收合的非 active 歷史分開，歷史強制 readonly，原百分比不變。

學生個別段考範圍：`exam-range.types.ts`／`exam-range-progress.ts` 定義範圍與不重複計數規則；`student-exam-ranges.tsx` 提供對話框與範圍卡片。`exam-ranges.ts` 選擇 Mock／Supabase repository，service 驗證後由 `exam-range-actions.ts` 稽核儲存。Supabase 使用 `202610160001_student_exam_ranges.sql` 的專用 read/save RPC，不改原 curriculum workspace。僅 plans tab 查詢；缺 migration 時局部提示，不影響原修課進度。部署及測試見 `frontend/docs/student-exam-ranges-verification.md`。

篩選條件與建立新範本區使用原生 `details/summary` 收合，共用 `curriculum-collapse-icon.tsx` 的 22px 箭頭與透明／淡灰 hover 背景，收合鍵不顯示文字，具 accessible name 與 tooltip。套用篩選保留漏斗及文字。收合保留選擇值，沿用 GET 篩選，不新增資料庫或 Client state。

建立新範本區塊使用原生 `details/summary`，預設展開，標題右側提供收合／展開控制與鍵盤操作。收合只隱藏表單，保留尚未儲存的輸入；不觸發建立 action，也不更動既有資料庫流程。

整份教材刪除沿用 `archiveTemplateAction → archiveTemplate → mutate_curriculum_workspace(archive)`，只設定封存狀態，不移除版本、內容、學生計畫或學習紀錄。`curriculum-template-delete.tsx` 在卡片三點選單與版本頁提供確認對話框。一般列表與可指派版本排除封存教材；「已封存」篩選及既有版本網址仍可唯讀查閱。成功後返回列表並刷新版本／學生頁，不需要新 migration。

教材草稿的編輯與刪除由 `curriculum-sortable-list.tsx` 單一 `activeDialog` 狀態控制；對話框開啟時停用其他列的操作及拖曳。`curriculum-item-delete-dialog.tsx` 提供刪除確認與子項目清單，保留原 `deleteTemplateItemAction`／revision，不在列內同時展開刪除確認與編輯表單。

教材卡片「更多操作」由 `curriculum-template-actions.tsx` 提供「編輯基本資料」對話框與「編輯內容」入口。基本資料懶載入經 `readTemplateEditorAction → curriculumRepository.templateEditor`；儲存經 `updateTemplateStateAction → updateTemplate → curriculumRepository.updateTemplate`。Supabase 使用 `202610110001_curriculum_template_editing.sql` 的兩支 guarded RPC，revision 防止覆寫，已發布／曾被計畫引用時鎖年級與科目；名稱、出版社仍可修改。沒有草稿時需確認複製最新版，不修改學生使用中的版本。草稿每列的編輯對話框由 `curriculum-item-editor.tsx` 提供，使用既有 `updateItem` 原子 RPC 與版本 revision。

搜尋 `frontend/src` 內的 `curriculum*.test.*` 與 `curriculum-sortable-list*.test.*`；新增版本、項目、排序、刪除或發布規則時，測試應跟隨相同 feature／server 邊界。
