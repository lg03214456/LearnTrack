# 今日課堂點名／學生分組歷史驗證（2026-10-19）

## 實作範圍

- 今日課堂新增「課堂點名」native dialog；出席／遲到／請假／缺席四種 radio 單選，未選擇／未變更者不送出。
- 遲到可選填實際到課 HH:mm，儲存在課堂日期、Asia/Taipei；登記時間由 server clock 產生，兩者不混用。切換到其他狀態清除到課草稿，留空不自動補現在時間。
- 更正既有點名或已完成課堂補登必填原因。服務／RPC 分開檢查 attendance.read/manage、tenant/class/student/member，lesson revision 和前筆 id。整批原子交易、successor append，保留原始紀錄；不修改 learning items 或 progress history。
- Audit preflight 失敗不寫資料；mutation 後 Audit append／網路結果不明不回報成功，UI 鎖住重試並要求重新載入。既有 Audit 邊界不是跨 Audit store 的分散式交易，勿將其描述成零風險回滾。
- 進度歷史依 studentId → studyPlanId/versionId 分組，student_learning_items.position 排項目、更正鏈保留原筆到後筆；時間顯示但不排序。缺少 metadata 不以同名教材合併、不捏造順序。
- 調課規則未確定，本次不建立調課資料或自動轉成請假／缺席。原進度勾選、完成課堂與更正功能保留，不掛載舊批次 UI。

## 實際執行

從 frontend 執行：

- `pnpm test src/features/class-sessions src/server/services/class-attendance-service.test.ts src/server/repositories/class-attendance.test.ts src/server/repositories/class-session-supabase.test.ts src/app/actions/class-attendance-actions.test.ts test/class-attendance-migration.test.ts`：9 files / 77 tests passed。
- `pnpm test`：100 files / 503 tests passed。
- `pnpm lint`、`pnpm typecheck`、`pnpm build`：passed。首次 typecheck 指出草稿 map 不能假定每個 key 都存在，改為 Partial<Record<...>> 後通過。
- `pnpm format:check`：exit 1，48 個既有非本次檔案的格式警告（原基線49，本次範圍內格式修正減少一個）。本次修改的 TS/TSX 與測試檔案以指定路徑執行 Prettier，未全專案重排。
- `node test/class-attendance-postgres-smoke.mjs <absolute PGlite module path>`：passed。沿用先前暫存安裝，不新增專案依賴。真正在隔離 PostgreSQL 執行既有 schema／RPC 與新 migration，測試原子 rollback、lesson／前筆 conflict、實際到課、保留原筆、更正原因、completed 補登、非 late 時間拒絕、直接 INSERT/UPDATE 拒絕、owner 也不可覆寫的 trigger、A/B／未指派班級／未授權學生／平台／anon 拒絕，以及 replaced plan 的歷史 metadata。permission helpers 是 fixture，非真實 Supabase membership/JWT 驗收；未模擬獨立連線多人競態。
- 本機瀏覽器（Supabase-backed）：確認新按鈕、開啟／取消 dialog、缺少 migration 顯示名稱並停用 radio／save、按學生呈現歷史與紀錄時間。未送出任何真實寫入。缺少 migration 時原始版本／排序明確標為尚未載入，待 SQL 後再驗。截圖僅保留標題／SQL 提示區域，裁去學生個資。
- 當前瀏覽器不提供 viewport capability，未宣稱已完成手機實機驗收；UI 採既有 max-height／scroll dialog，狀態 grid 兩欄至四欄，後續仍需窄螢幕實測。

## 必須由使用者執行的 SQL

先確認已套用 `202610030001_class_session_progress.sql`、curriculum lifecycle、`202610100001_class_session_functions.sql`，再在同一 Supabase 專案 SQL Editor 完整執行：

`supabase/migrations/202610190001_class_attendance_and_history.sql`

不需要重建表，不刪現有資料、不更改環境變數。此 migration 撤銷 attendance_records 的直表寫入，只許 guarded RPC。若缺少 v2 RPC，程式僅用原真實讀取函式保持課堂進度可讀，點名不可存，不用 Mock 繞過。

執行後可先唯讀確認：

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'attendance_records'
  and column_name = 'arrived_at';

select to_regprocedure('public.open_class_daily_workspace_v2(text,text,date)'),
       to_regprocedure('public.save_class_daily_attendance(text,jsonb)');
```

## 逐步驗收（指定測試班級／學生，不操作正式真實出缺席）

1. 重新整理今日課堂，開啟點名，確認不再提示缺少 SQL；取消後資料不變。
2. 僅選一位學生出席→確認→重整，狀態仍是出席，其餘未點名者保持原狀。
3. 另一位選遲到、時間18:42→確認→重整；實際到課是該課堂日期18:42，登記時間是這次操作時間。
4. 再次更改第一位狀態：需要原因；確認後查 attendance_records，原筆仍在，successor.supersedes_id 指向原筆。
5. 兩個視窗同課堂，先在A儲存，再用B舊畫面儲存；B應提示重新載入，不覆蓋A。
6. 點姓名登記不同教材項目，刻意先第3項再第1項；歷史按學生／版本分組，第1項仍在第3項之前，時間可不同但不影響順序。
7. 已完成課堂補登點名需要原因；進度更正控制仍能使用，保留原紀錄。
8. 窄螢幕檢查四狀態、時間、原因、footer不超出框，鍵盤／Escape關閉回原按鈕；送出中不可重複儲存或關閉。
9. 在獨立測試資料庫用 A/B、Platform、anonymous 真實 JWT 重跑允許／拒絕矩陣，確認 Audit 與 RLS；不以 secret key 模擬使用者。

本次沒有套用共享 SQL、修改 Vercel、commit、push 或真實點名寫入。上述待驗項目不能稱為部署／真實 RLS 已通過。
