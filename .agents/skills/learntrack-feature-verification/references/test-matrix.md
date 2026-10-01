# LearnTrack Test Matrix

依變更範圍讀取對應區塊；不要為了小修改載入或執行無關的外部驗收。

## UI 與 route

- Component 互動：使用 Testing Library 驗證可見結果、表單狀態、鍵盤操作與 accessible name，避免只測 className 或內部 state。
- Route／layout：驗證必要的 redirect、404、授權拒絕、空狀態與 Server Component 資料來源。
- 修改 Server／Client boundary、route 或 layout 時執行 `pnpm build`。
- 主要對應位置：`frontend/src/features/**/**.test.tsx`、`frontend/src/app/**/**.test.tsx`、`frontend/src/components/**.test.tsx`。

## Action、service 與 repository

- Action：驗證輸入正規化、錯誤回傳、授權、scope、成功後的資料刷新或 redirect。
- Service：驗證狀態轉換、not-found、conflict、denied 與成功路徑。
- Repository：驗證 organization filter、排序、分頁、資料轉換與錯誤 fail-closed。
- 不用 service-role 或未加 scope 的 fixture 取代真正的 tenant boundary。

## Authentication 與密碼重設

至少覆蓋：

| 情境 | 預期 |
|---|---|
| Organization Owner 正確帳密 | 建立 Session，導向機構頁面，寫 `audit_logs` |
| Platform Owner 正確帳密 | 建立平台 context，導向 `/platform`，寫 `platform_audit_logs` |
| 錯誤密碼／未知帳號 | 回傳安全的一般錯誤，不洩漏帳號是否存在，不產生 500 |
| inactive／suspended 身分 | 拒絕登入且不得 fallback 成其他角色 |
| Recovery hash token | 建立 recovery session、清除 URL token、顯示新密碼表單 |
| PKCE `code` | exchange code、清除 query、顯示新密碼表單 |
| 無效／已使用／過期連結 | 顯示重新申請，不允許更新密碼 |
| 更新成功 | 舊密碼失效、回登入頁、一次性連結不可重用 |

常用測試：

```powershell
pnpm test src/server/auth/supabase-providers.test.ts
pnpm test src/server/services/authentication-integration.test.ts
pnpm test src/server/audit/authentication-audit.test.ts
pnpm test src/features/authentication/components/supabase-reset-password-form.test.tsx
```

## RBAC、多租戶與 Platform Owner

最小 actor matrix：

| Actor | Organization A | Organization B | Tenant mutation | Platform route |
|---|---|---|---|---|
| Org A Owner | 依權限讀寫 A | 拒絕 B | 僅 A | 拒絕 |
| Org B Owner | 拒絕 A | 依權限讀寫 B | 僅 B | 拒絕 |
| Platform Owner | 明確 target 後唯讀 | 明確 target 後唯讀 | 拒絕 | 允許 |
| Anonymous | 拒絕 | 拒絕 | 拒絕 | 拒絕 |

必須驗證：

- Platform 與 tenant permission catalog 分離。
- URL label、local storage、表單 organization ID 不能取代 server-resolved context。
- 從 A 切到 B 時，畫面不得保留 A 資料。
- Platform inspection 每次寫入目標 organization 的平台 Audit。
- 一般 Owner 即使擁有所有 tenant permissions，也不能獲得平台權限。

## Supabase migration 與 RLS

先執行靜態 migration 測試：

```powershell
pnpm test test/supabase-migrations.test.ts
```

靜態測試至少檢查：表、constraint、index、RLS enablement、grant／revoke、policy、append-only trigger 與禁止 self-promotion。

若有隔離的 Supabase 測試資料庫，再用真實 JWT 驗證：

- Org A token 不能讀寫 Org B。
- Platform token 僅能執行規格允許的跨租戶 SELECT。
- anon key 單獨使用不能取得受保護資料。
- ordinary authenticated user 不能修改 platform operator／permission assignment。
- Platform Owner tenant mutation 被 server 與 RLS 拒絕。
- `audit_logs` 與 `platform_audit_logs` 無法 update／delete。

不得直接在共享正式資料庫執行破壞性 RLS 測試。沒有測試資料庫時，標記此區塊為「待 database integration」，不要以 service-role 查詢代替。

## Audit

- Organization actor 的事件只寫 `audit_logs` 並帶真實 `organization_id`。
- Platform actor 的事件只寫 `platform_audit_logs`，需要時帶 `target_organization_id`。
- 不使用 `authentication`、`platform` 等假 organization ID。
- metadata 只允許 catalog 中的安全欄位，不保存 email、phone、password、token、secret、完整 payload。
- Audit 寫入是安全必要條件時，失敗必須 fail closed 並保留可診斷錯誤。

## Mock 與持久化

驗證前確認 repository provider。Mock 測試可以驗證 UI／業務規則，但不能證明：

- 重新整理後資料仍存在。
- 另一台裝置可看到相同資料。
- RLS 或 organization isolation 生效。
- Platform Owner 與 Organization Owner 讀到同一來源。

報告中使用 `Mock-backed`、`Supabase-backed` 或 `mixed` 明確標記資料來源。
