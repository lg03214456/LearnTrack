## Why

教材範本明細目前只能新增項目，缺少刪除與排序能力，老師無法在同一個畫面完成章節、單元與考卷清單的日常維護。補齊明確的編輯操作可避免依賴假資料順序或直接修改程式碼。

## What Changes

- 在教材範本版本明細加入可理解的新增項目流程，包含類型、名稱與必要驗證。
- 允許刪除尚未發布版本中的教材項目，刪除前要求確認並提供成功／失敗回饋。
- 允許使用拖曳把手動態調整項目順序，支援滑鼠、觸控與鍵盤；清單不顯示額外的上移／下移按鈕。
- 發布版本維持唯讀，不顯示或拒絕任何新增、刪除、重排寫入。
- 所有寫入透過 Server Action、service 權限／版本檢查與 resettable mock store；保留未來替換 Supabase repository 的邊界。

## Capabilities

### New Capabilities

- `curriculum-template-item-management`: 教材範本項目的新增、刪除、排序、發布狀態限制、權限與操作回饋。

### Modified Capabilities

無。既有 `curriculum-template-library` 尚未同步至主 specs，本次以獨立且可後續合併的項目管理能力描述增量行為。

## Impact

- 影響教材範本版本明細 route、curriculum feature components、Server Actions、curriculum service 與 mock store。
- 擴充教材項目 mutation command、stable result、revision 與排序測試。
- 新增可存取的 sortable 套件，並在系統架構文件集中記錄套件名稱、用途、所在邊界與替代方案。
- 正式資料庫仍需 transaction、唯一排序約束及 Supabase RLS policy。
