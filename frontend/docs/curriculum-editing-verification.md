# 教材編輯驗證（2026-10-11）

## 建立範本收合（2026-10-13）

依使用者澄清，收合鍵統一為共用 `CurriculumCollapseIcon`：22px 灰色箭頭、透明背景／淡灰 hover，不呈現展開或收合文字。「套用篩選」恢復漏斗加文字；收合不提交 action。聚焦 5 tests、全套 376 tests 通過，lint／typecheck 通過，format:check 仍為 49 個既有格式問題。瀏覽器實際收合兩區塊並確認欄位隱藏，未寫入資料庫；無 route／boundary 變更，不需本次 build。

篩選區後續調整：右上箭頭 icon 收合／展開，套用按鈕只呈現高對比漏斗 icon；保留 accessible name、tooltip、GET 流程與條件值。聚焦 `pnpm test src/features/curriculum/components/curriculum-directory.test.tsx` 5 tests 通過，全套 `pnpm test` 376 tests / 83 files 通過，`pnpm lint`、`pnpm typecheck` 通過；`pnpm format:check` 仍為 49 個既有格式問題。瀏覽器已點擊收合與展開，最終截圖確認條件欄位與 icon 顯示；未提交真實資料寫入。無 boundary／route 變更，未重新 build 或驗證部署。

- 建立區塊預設展開，右側「收合／展開」採原生 disclosure，保留未儲存輸入且不提交 action；沒有新增 Client boundary、SQL 或環境設定。
- `pnpm test src/features/curriculum/components/curriculum-directory.test.tsx`：4 tests 通過。
- `pnpm test`：375 tests / 83 files 通過；`pnpm lint`、`pnpm typecheck` 通過。`pnpm format:check` 仍回報 49 個既有檔案格式問題（exit 1），本次修改檔案已格式化。
- 本機既有 Owner session 瀏覽器驗收：展開後範本名稱欄位可見，收合後不可見；未建立或刪除真實教材。
- 本次不涉及 route、Server／Client boundary 或部署設定，未重新執行 build；真實資料庫寫入／Preview／Production 不在本次驗收範圍。

本次入口：教材卡片三點選單的基本資料與內容編輯；草稿教材項目編輯對話框。

## 本機結果

- `pnpm test`：368 tests / 83 files 通過。
- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
- `pnpm build`：通過；之後已重新啟動 localhost:3000。
- `pnpm format:check`：49 個既有非本次檔案格式問題；本次修改檔案已個別格式化。
- `node test/curriculum-postgres-smoke.mjs <PGlite module path>`：隔離 PostgreSQL 通過 metadata 修改、過期 revision、分類鎖、重複名稱 rollback、跨組織／匿名拒絕、直接表寫入拒絕與學生快照不變。暫存安裝 PGlite，未新增專案 dependency。
- 瀏覽器：使用既有機構管理 session，教材三點選單、metadata 對話框載入／安全錯誤提示、內容複製確認對話框與關閉均可操作；未提交共享 Supabase 寫入。

## 尚待完成

實際 Supabase 尚需套用 `202610110001_curriculum_template_editing.sql`（前置 `202610100002_curriculum_functions.sql`）。套用後重新開啟基本資料對話框、修改並重整確認持久化。隔離 PostgreSQL 的 membership helpers 是 fixture，不等同真實 Supabase JWT／RLS matrix；Preview／Production 與跨裝置持久化仍待驗收。不得因此將 OpenSpec 6.x 整體標為完成。

## 使用者測試步驟

1. 執行新 migration 後，教材三點 → 編輯基本資料；確認分類、名稱與出版社載入。
2. 修改名稱／出版社、儲存後重整；確認仍顯示新值。
3. 已發布教材的年級與科目鎖定；尚未發布教材允許調整。
4. 編輯內容：已有草稿直接進最新草稿；沒有草稿先確認複製，再進入新版本。
5. 草稿項目「編輯」：修改名稱、類型與所屬單元；儲存／重整確認。
6. 保留另一視窗舊表單，先在第一視窗儲存，再提交舊表單；應顯示 conflict，不覆寫新資料。
7. 檢查原已發布版本、學生修課計畫與完成進度不變。機構 B、唯讀、Platform Owner、匿名拒絕路徑須另用隔離帳號驗證。

## 整份教材軟刪除驗證

- 卡片三點 → 刪除教材，或版本明細 → 刪除教材；先確認再封存。一般列表隱藏，已封存篩選仍可唯讀查閱；版本與學生計畫／完成進度保留，不能再新指派。
- `pnpm test src/features/curriculum/components/curriculum-detail.test.tsx src/features/curriculum/components/curriculum-template-actions.test.tsx src/server/repositories/curriculum-core.test.ts src/server/services/curriculum-service.test.ts src/app/actions/curriculum-actions.test.ts src/server/repositories/curriculum-supabase.test.ts`：59 tests / 6 files 通過。
- `pnpm test`：374 tests / 83 files 通過；`pnpm lint`、`pnpm typecheck`、`pnpm build` 通過。
- `pnpm format:check`：仍有 49 個既有檔案格式問題；本次相關檔案已個別格式化。
- `node test/curriculum-postgres-smoke.mjs <PGlite module path>`：封存後 plans、learningItems、items、versions 均不變；新指派拒絕。第一次新增斷言期待 SQLSTATE 23514，實際是 P0002 / TEMPLATE_NOT_FOUND；依既有函式修正測試期待值後通過，未放寬資料庫檢查。
- 瀏覽器 session 已過期，重載回登入頁，尚未完成本次畫面驗收；沒有提交共享 Supabase 刪除。真實 JWT／RLS、Preview／Production 持久化仍待驗證。
- 沿用既有 archive RPC 與 archived_at，不需要新增 SQL 或環境變數。

使用者登入後，可用可捨棄教材測試：取消確認時列表不變；確認刪除後一般列表隱藏；「已封存」可查閱且不能編輯；學生原修課計畫與完成率不變，新指派下拉不再列出該教材。
