---
name: learntrack-feature-verification
description: Verify LearnTrack code changes and regressions with focused tests, full quality gates, authorization/RLS checks, browser acceptance, and deployment diagnostics. Use when implementing, fixing, reviewing, or preparing to deploy LearnTrack code; do not use for product-planning or documentation-only work.
---

# LearnTrack Feature Verification

驗證 LearnTrack 變更是否真的可用、安全且可部署。以變更風險選擇驗證，不把「Build 成功」當成功能正確，也不把 Mock 測試通過當成 Supabase／RLS 已驗證。

## Workflow

1. 先看 `git status --short` 與相關 diff，保留使用者既有修改；辨識本次實際影響的 route、component、action、service、repository、provider、migration 與環境設定。
2. 依 [test-matrix.md](references/test-matrix.md) 選擇最小但足夠的 focused tests。修 bug 時，能可靠重現就先加入 regression test，並確認它會捕捉原失敗行為。
3. 從 `frontend/` 執行 focused tests。單檔使用 `pnpm test <test-path>` 或 `pnpm exec vitest run <test-path>`；不要在測試路徑前多傳一個 `--`，否則可能意外執行全套而失去聚焦效果。
4. 程式完成後至少執行：

   ```powershell
   pnpm format:check
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

   只在使用者要求修改格式時執行 `pnpm format`；避免格式化不屬於本次範圍的既有工作。
5. 變更 route、Server／Client boundary、認證、環境設定、Next.js 設定、依賴或部署行為時，再執行：

   ```powershell
   pnpm build
   ```

6. 涉及 Auth、RBAC、Platform Owner、organization scope、RLS、migration、Audit、密碼重設或跨租戶資料時，必須讀 [test-matrix.md](references/test-matrix.md) 的安全矩陣，驗證允許與拒絕兩條路徑。UI 隱藏不算授權測試。
7. 需要瀏覽器、Preview 或 Production 驗收時，讀 [deployment-acceptance.md](references/deployment-acceptance.md)。先確認目標環境和測試帳號，不在未授權的正式環境寫入或刪除資料。
8. 結果報告必須列出：實際執行命令、通過數、失敗與錯誤原文摘要、未執行項目及殘餘風險。不可把未執行、被跳過、只靠靜態字串或依賴 Mock 的檢查描述為通過。

## Fail-closed rules

- 認證、授權、Audit 或 RLS 失敗不得用停用安全檢查、改成 `mock`、使用 service-role 模擬使用者權限，或建立假的 organization 來繞過。
- Tenant 驗證至少包含 organization A、organization B、Platform Owner 與 anonymous／unauthorized；確認讀寫範圍，而不只確認頁面能開。
- Migration 靜態測試只能證明 SQL 形狀；涉及 RLS 行為時，若沒有可用測試資料庫，要明確標記 database integration 尚未驗證。
- Supabase Secret、token、Recovery URL、Cookie 與真實個資不得出現在測試輸出、fixture、截圖或提交內容。
- 現行一般機構學生／班級功能仍有部分 Mock repository。驗收報告要說明資料來源，重新整理後仍存在的資料才可視為持久化成功。

## Completion threshold

只有在本次變更的 focused tests、必要的全套品質門檻、對應安全矩陣與要求的環境驗收均完成後，才能說「完整通過」。若 Preview／Production 或真實 RLS 無法測試，程式可標為本機驗證完成，但不得標為部署驗收完成。
