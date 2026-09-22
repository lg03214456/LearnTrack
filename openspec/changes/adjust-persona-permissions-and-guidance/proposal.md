## Why

目前 Mock 身分只涵蓋內部教職角色，管理員權限過大，且切換後無法快速理解該角色的操作入口與限制。新增主任、Owner、老師、學生與家長的清楚權限矩陣，能在串接 Supabase Auth 與 RLS 前先驗證不同使用者旅程與資料範圍。

## What Changes

- 將 Owner 定義為機構最高權限，保留所有功能與角色治理能力。
- 將現行管理員調整為「主任」，負責組織內日常教務、班級、學生與帳號管理，但不得修改 Owner 身分或系統角色。
- 老師只可讀寫被指派班級的學生、出勤、進度、成績與修課計畫，不可管理帳號、角色或班級生命週期。
- 新增學生 Persona，只能查看自己的課程、進度、出勤與考試紀錄。
- 新增家長 Persona，只能查看已綁定孩子的課程、進度、出勤、成績與教師對家長公開的評語。
- 在 Mock 身分切換區顯示角色說明、資料範圍、建議起始頁與主要可用操作，讓開發者可快速理解驗證流程。
- 更新角色權限頁、測試與使用者操作手冊；系統架構文件不變。

## Capabilities

### New Capabilities

- `persona-access-experiences`: 定義 Owner、主任、老師、學生與家長的權限、資料範圍、導覽及 Mock 切換說明。

### Modified Capabilities

無。既有 RBAC change 尚未同步至主 specs，本次以可獨立審閱的新能力承接角色體驗調整。

## Impact

- 影響 access-control contracts、Mock profiles／roles／memberships、identity scope、permission-aware navigation、角色權限 UI 與測試。
- 學生與家長需要 self／linked-students 資料範圍；現階段使用 Mock 關聯，正式環境須映射至 Supabase membership、guardian link 與 RLS。
- 更新 `docs/user-operation-manual.md` 的角色矩陣與切換驗證步驟，不修改 `docs/system-architecture.md`。
