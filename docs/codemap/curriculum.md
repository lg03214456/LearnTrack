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
| 教材與修課計畫指令、權限檢查 | `frontend/src/server/services/curriculum-service.ts` |
| 教材項目新增、編輯、排序、刪除 | `frontend/src/server/services/curriculum-item-service.ts` |
| 教材 Server Actions | `frontend/src/app/actions/curriculum-actions.ts` |
| 可重設的教材假資料 | `frontend/src/server/data/mock/curriculum.ts` |

Repository 是未來 Supabase adapter 的替換邊界；UI 不應依賴 mock store 或資料庫 row shape。拖曳排序須保留鍵盤替代操作與失敗回復。

教材內容採兩層視覺語意：`unit` 是最上層單元大綱，`chapter`、講義、練習與測驗可透過 `parentId` 歸入該單元。明細頁以主色單元卡與縮排內容列呈現，新增內容時需先選擇所屬單元；排序資料仍以同一份扁平清單儲存，避免 UI 直接依賴特定資料庫樹狀格式。

版本明細頁不顯示獨立返回按鈕，改由頁首 `教材範本 / 版本內容` 麵包屑 Tree 返回範本庫；全系統第二層頁面沿用相同導覽模式。新增教材內容則從內容清單右上角展開，讓建立、排序與刪除操作集中在同一工作區。

教材版本只綁定學生 Study Plan，不綁定班級。班級今日課堂透過 `studyPlanId + learningItemId` 更新學生項目狀態；備註是選填自由文字，不參與完成率計算。

## 主要測試

搜尋 `frontend/src` 內的 `curriculum*.test.*` 與 `curriculum-sortable-list*.test.*`；新增版本、項目、排序、刪除或發布規則時，測試應跟隨相同 feature／server 邊界。
