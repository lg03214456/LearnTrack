# 學生連續設定驗證（2026-10-18）

## 操作流程

1. 在 `/students` 按「新增學生」，填姓名、電話，勾選所屬班級；學號唯讀，延用伺服器自動編碼。
2. 按「儲存並設定教材」。確認仍在同一個對話框，顯示已儲存的學生與學號。
3. 選學期及已發布教材，按「儲存教材」。可繼續指派其他科目；同學期同科目更換須確認，完成歷史沿用原規則保留。
4. 按「繼續設定段考」，輸入名稱、日期，勾選儲存後重新查得的教材內容，儲存範圍。
5. 查看結果摘要與個人頁。選「新增下一位」時，姓名、學號、班級、教材與段考輸入全部重設。
6. 個人頁學生摘要下方可開啟「基本資料／班級與學習設定」，修改既有資料，或直接進教材、段考步驟。基本資料使用 roster revision，不使用 profile revision。
7. 修課頁先顯示段考範圍，再顯示目前計畫；歷史／非使用中計畫預設收合，展開也無更新控制。

每一步獨立提交，並非跨步驟交易。「稍後設定」、取消、關閉及後一步失敗不會回滾前一步。發生傳輸／稽核不確定結果時停止重送，先重新載入名單或個人頁確認，不可逕自再新增一位。

## 資料與部署

- 沒有新增 SQL、環境變數或套件，沿用目前 provider、使用者 JWT、權限、scope 與 Audit。
- 需要已安裝的學生／班級、curriculum RPC；段考沿用 `202610160001_student_exam_ranges.sql`。缺段考 SQL 只顯示局部無法載入，可先完成學生步驟。
- 新增／基本資料及班級設定沿用 organization-wide `students.manage`；班級欄位另需 `classes.manage`，無權限時傳 `classIds: undefined`，不清空原班級。
- 教材／段考讀寫仍需原 study plan 權限與學生 scope；平台唯讀不新增寫入入口。受限老師仍可用原個人頁獨立教材／段考入口。
- 對話框以組織／membership／student 為 context key；伺服器再次驗證 context 與資料範圍。
- 沒有設定一律顯示未設定或數量 0；拒絕與無法載入分開呈現，不把失敗當空資料。完成頁未讀取的步驟顯示「尚未確認」。
- 回滾 UI／actions 不刪除已存學生、入班關係、計畫或段考。不要移除 migration 或刪表做 UI rollback。
- 舊學生若本身學號為空，仍受既有主檔驗證限制；須先確認先前學號補齊作業，這次不擅自更改現有資料。

## 自動測試與品質門檻

均從 `frontend/` 執行。

- `pnpm test src/features/students/components/student-setup.test.tsx src/app/actions/student-setup-actions.test.ts src/app/actions/student-setup-plan-actions.test.ts src/features/curriculum/components/student-study-plans.test.tsx`：4 files / 25 tests 通過。
- `pnpm test`：第一次 442 通過、3 失敗（route fixture 缺少既有必備 `profile.classes`）；補齊 fixture 後 94 files / 445 tests 通過。增加取消／焦點測試後最終重跑：94 files / 446 tests 全數通過。
- `pnpm lint`、`pnpm typecheck`、`pnpm build`：通過。Build 編譯全部 23 routes，未新增 route。
- `pnpm format:check`：未通過，49 個既有非本次範圍檔案需格式化；未整批重排使用者原有修改。本次觸及檔案另用 targeted Prettier 檢查。
- 最終針對本次 20 個新增／修改的程式與測試檔執行 `pnpm exec prettier --check <affected files>`：全部通過；再次執行 `pnpm lint`、`pnpm typecheck`、`pnpm build` 通過。
- 初始新增→教材→段考→摘要、返回更新 identity/revision、延後不寫相依資料、下一位重設、傳輸不確定不重送、scope 拒絕、Audit 失敗、舊 redirect action、歷史唯讀都有 fixture-backed 測試。這些不代表真實 RLS integration 通過。

## 瀏覽器驗證與待驗收

目前 localhost 已登入頁面，僅做 read-only 驗證：

- 既有學生主檔／班級預載、目前教材與段考數量載入。
- 不重存主檔，直接切換段考步驟；無教材顯示說明，禁止空範圍儲存。
- 從名單新增入口開啟三步對話框，關閉未建立學生，焦點返回觸發按鈕。
- 390×844 viewport：對話框寬 358px，`scrollWidth === clientWidth === 358`，欄位與按鈕留在框內；測後恢復原 viewport。
- 證明圖為空白新增表單裁切，沒有真實姓名、電話或 token：`student-setup-mobile.png`（本聊天 visualization artifact）。

尚未執行：共享資料庫實際新增／修改、重新整理持久化、兩組織真實 JWT／RLS、Preview／Production journey。需要使用者指定隔離環境及可寫測試紀錄，不能將本機 action/UI fixtures 代稱正式驗收。OpenSpec 4.2 維持未完成。
