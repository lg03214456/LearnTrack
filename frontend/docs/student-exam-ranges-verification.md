# 學生個別段考範圍

## 本次本機結果

- `pnpm test`：421 tests / 90 files 通過；範圍計算、Mock／stub RPC、service、action、component、學生 route 與 migration 靜態測試包含在內。
- `pnpm lint`、`pnpm typecheck`、`pnpm build` 通過。
- `pnpm format:check`：exit 1，49 個既有檔案格式問題；本次新增／修改檔案已個別格式化，沒有批次格式化無關檔案。
- `node test/exam-ranges-postgres-smoke.mjs <PGlite module path>` 通過。初次 fixture helper 缺少 security-definer 導致直表 RLS 測試讀學生表被拒，將隔離 helper 調整為與既有 helper 相同的 security-definer 形狀後通過，沒有放寬正式權限。
- `openspec validate add-student-exam-ranges --strict` 通過；這不代表未執行的 Supabase／部署驗收完成。
- 瀏覽器 localhost 既有 Owner session：新段考區顯示缺 SQL 更新提示，同頁既有教材計畫與進度仍正常呈現。未送出真實段考寫入；實際建立／編輯畫面及重整持久化待套用 migration 後驗收。
- 本機已有 port 3000 server；額外 `pnpm dev` 嘗試因既有 server 而退出，未停止使用者的程序，沿用 localhost:3000。

## 套用順序

1. 確認目前連接的 Supabase 專案與備份狀況。執行唯讀 `supabase/checks/student_exam_ranges_preflight.sql`：既有學生／修課／教材表及 `private.can_access_student(text,text,text)` 必須存在。新增段考表／RPC 第一次應為 NULL；若已存在，先檢查，不要刪表或直接重跑。
2. 在 Supabase SQL Editor 執行 `supabase/migrations/202610160001_student_exam_ranges.sql` **一次**。它新增兩張表、同租戶／學生／計畫關聯鍵、索引、RLS 與 read/save RPC；不建立測試段考、不改學生進度、不新增環境變數。既有同名資料表不會被覆寫。
3. 重新執行 preflight 最後一段：兩張表 `rls_enabled = true`，三種 `direct_* = false`。
4. 更新程式後進入學生 → 修課進度 → 設定段考範圍。SQL 未套用時，只有段考區顯示更新提示；原教材進度不會被替換成假資料。

## 計算與操作

- 每位學生可以有多次段考；一次範圍可跨該學生不同使用中教材，畫面保留教材名稱、版本與學期。
- 填寫段考名稱（最多 100 字），日期選填，勾選 1～500 個內容項目。單元勾選展開子項目；只將可計數的非單元內容送到資料庫，不重複算單元。
- `completed / distinct selected items`，四捨五入成整數百分比。略過、待進行、進行中、後續被移除的已選項目都保留分母，只有 completed 計入分子；不讀取備註或考卷分數。
- 取消不寫入，儲存中不能重複送出或關閉。衝突保留表單並請使用者關閉、重新載入；沒有範圍時顯示空狀態，不捏造 0%。
- 舊計畫更換／封存、項目移除時，範圍引用保留並提示檢查；不自動轉到新版或移除未完成項目。編輯可保留既有歷史選取或改勾目前使用中計畫。

## 手動驗收（使用可捨棄的隔離資料）

1. 學生 A 綁定已發布教材，打開設定框，選一個單元及其中一個章節，確認只計算一次。取消，確認資料庫未新增。
2. 建立「第一次段考」並選十個項目，完成六個應顯示 6 / 10、60%；範圍外進度、分數與備註不影響此百分比。
3. 編輯範圍並重整頁面，檢查名稱、日期、選取、計數一致；學生 B 不應出現 A 的段考。切換不同學生後不沿用上一人的表單。
4. 兩個視窗打開同一筆，先儲存其中一個，再送出另一個：應拒絕 stale revision，不覆寫。
5. 更換教材版本後，舊範圍保留版本標籤與檢查提示；明確編輯後才能切換範圍，不改歷史完成狀態。
6. Owner／指派老師允許；另一機構、未指派老師、無管理權限的學生／家長、Platform Owner 與匿名寫入均拒絕。讀取同樣依學生 scope 控制。
7. 以真實 Supabase JWT 驗證 RLS／RPC，不使用 secret key 代替使用者。併發 save 與教材 replacement 應驗證鎖順序與 eligibility 重檢。

## 驗證界線與回復

單元／component 測試使用 Mock 或 stub RPC。隔離 PGlite 腳本 `node test/exam-ranges-postgres-smoke.mjs <PGlite module path>` 真正執行 schema、RPC、FK、RLS／角色權限、revision 與歷史保留，但 student permission helpers 是測試 fixture，不能宣稱真實 Supabase JWT/persona matrix 或獨立連線競態已完成。

沿用既有 required Audit：preflight 失敗不執行 mutation；append 失敗不回傳成功。Audit 與 domain RPC 不是單一資料庫 transaction，append 失敗時 domain 寫入可能已完成，提示要求先重新載入確認，不能宣稱自動回滾。

部署先套 SQL 再更新應用。回退應用版本時保留 additive tables 與已存範圍，不刪除學生學習歷史；需回復資料時由使用者確認備份與目標後另行處理。Preview／Production、真實 JWT 與共享資料庫的新增／刪除不會自動執行。
