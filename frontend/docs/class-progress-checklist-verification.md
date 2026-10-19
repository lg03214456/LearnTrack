# 今日課堂：學生進度勾選（2026-10-19）

## 使用流程

1. 進入班級「今日課堂」，確認日期，點「學生進度」名單中的學生姓名。
2. 對話框按學生自己的 active plan／版本列出內容。灰色已勾選項目是原已完成紀錄，不能在此取消。
3. 勾選本次完成項目，可跨多份教材；未勾選項目不送出、不重設狀態。
4. 備註選填，同次勾選項目使用同一份備註；如需逐項不同備註，使用進階登記。
5. 按「確認儲存」即呼叫既有 audited save action，不需再按第二次統一更新。成功後重新查詢名單及課堂歷史，不在前端自行推算新 revision。
6. 已完成課堂使用原 append action，必須填補登原因。既有錯誤紀錄仍從下方歷史做 successor 更正，不抹除原紀錄。
7. 「取消」、Escape、關閉會清除本次勾選，不寫入資料。儲存期間停用取消／關閉／重送。

後續使用者要求移除統一更新入口：今日課堂不再掛載進階 batch editor，僅透過學生姓名對話框直接儲存。原 batch component/action 暫保留相容性，不在使用者畫面呈現；歷史更正仍保留。Regression test 確認即使有管理權限，也沒有隱藏的統一更新按鈕。

## 失敗處理

- Validation：顯示錯誤，保留勾選與備註供修正。
- Conflict／forbidden／not-found：禁止用舊 snapshot 重送，提供「重新載入確認紀錄」。
- 傳輸、服務或 Audit 例外：結果可能不確定，不宣稱 rollback、不自動 retry，須重新查詢紀錄後再操作。
- 組織 membership、課堂 ID、日期、revision 變更會重建該工作區，避免上一個 context 的草稿流入下一個。過期 request callback 不更新已卸載的對話框。
- 唯讀身分可看目前內容，但沒有儲存或進階寫入入口。請假／缺席沒有預選更新，只有明確勾選才會送出。

## 程式與資料邊界

- `class-daily-workspace.tsx`：姓名入口、進階編輯器、refresh 與 context reset。
- `student-progress-checklist-dialog.tsx`：native dialog shell、勾選、備註、補登原因及 typed actions。
- `progress-checklist.ts`：純函式只組合當前學生的選取內容，忽略其他學生 ID、原 completed 項目及未選項目；保留原 session member、plan、item revision。
- 沿用 `saveDailyProgressAction`／`appendCompletedProgressAction` → provider service → repository/RPC；組織、權限、學生／教材關聯與原子性由原後端再次驗證。沒有從 browser 直連資料庫、沒有 secret-key 或 Mock fallback。
- 本次沒有修改 SQL、表、RPC、權限目錄、環境變數或進度計算公式。UI rollback 不刪除已保存進度／歷史。

## 自動驗證

從 `frontend/` 執行：

- `pnpm test src/features/class-sessions/components/class-daily-workspace.test.tsx src/app/actions/class-session-actions.test.ts src/server/services/class-session-service.test.ts`：最初 23 tests 通過；其後新增進階草稿保護測試，UI focused 單檔為 13 tests 通過。
- `pnpm test`：第一次全套 94 files / 455 tests 通過；新增草稿保護後最終全套 94 files / 456 tests 通過。
- `pnpm lint`：通過。
- `pnpm typecheck`：初次測試誤用了 browser locator 的 `exact` option；移除後通過。
- `pnpm build`：通過，包含原課堂、學生及歷史路由；未新增 route。
- `pnpm format:check`：49 個既有非本次修改檔案需格式化；沒有整批格式化其他工作。本次 5 個新增／修改程式與測試檔另做 targeted Prettier check。
- 最終對這 5 個檔案執行 `pnpm exec prettier --check` 全部通過，並再次執行 `pnpm lint`、`pnpm typecheck`、`pnpm build` 通過。

組件測試涵蓋跨教材選取、原 revision、僅當前學生 payload、取消及焦點返回、已完成 readonly、空教材、唯讀、請假預設、validation 草稿保留、conflict reload、uncertain 禁止重送、pending／Escape／重複 submit、completed append reason、context reset 與進階草稿保護。

## 瀏覽器與驗收限制

後續移除 batch UI 的驗證：`pnpm test src/features/class-sessions/components/class-daily-workspace.test.tsx`（13 tests）、`pnpm test`（94 files / 456 tests）、`pnpm lint`、`pnpm typecheck`、`pnpm build` 全部通過；本次兩個程式／測試檔 targeted Prettier check 通過，全專案仍為相同 49 個既有格式警告。這次 UI 移除未再執行瀏覽器／資料庫寫入驗收。

點名擴充尚未實作：repository migration 中 `attendance_records.recorded_at` 是登記時間，不是到課時間。是否新增 arrived_at、如何處理個別調課或整堂改期，需先確認產品規則，不能把調課默認成請假或缺席，也不能將目前沒有的點名儲存按鈕描述為完成。

在既有 localhost 登入頁面完成 read-only browser 驗證：重載新 UI、姓名開啟、原完成狀態 checked/disabled、勾選後計數與確認鍵啟用、取消後再次開啟計數 0／確認鍵 disabled。

390×844 viewport：dialog 外寬 358px；`clientWidth === scrollWidth === 343`，內容無橫向溢出；可捲動到備註、取消與確認控制。測後恢復 viewport，收合進階區。聊天的 `class-progress-checklist-mobile.png` 僅保留教材與控制區，裁掉真實姓名與學號。

沒有提交真實學生資料，沒有執行共享資料庫新增／更正。Unit tests 使用 fixtures／mocked actions，不能證明真實 JWT/RLS、Audit 寫入、重新整理持久化或 Preview/Production 驗收；這些仍需指定可寫測試紀錄與隔離環境。
