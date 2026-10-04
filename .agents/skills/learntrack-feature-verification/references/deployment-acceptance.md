# LearnTrack Deployment Acceptance

只在需求包含瀏覽器驗收、Preview、Production、Vercel、Supabase Auth Email 或實際部署時使用。

## Environment matrix

| 環境 | 程式來源 | Vercel scope | 常見用途 |
|---|---|---|---|
| Local | 工作目錄 | `.env.local` | 開發與 focused browser test |
| Preview | 非 production branch／PR | Preview | 部署前功能驗收 |
| Production | production branch，通常 `main` | Production | 正式入口 |

確認環境變數存在於實際 deployment scope，而不是只看名稱相同：

```text
LEARNTRACK_AUTH_PROVIDER
LEARNTRACK_EMAIL_PROVIDER
LEARNTRACK_AUDIT_PROVIDER
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
AUTH_SITE_URL
AUTH_PASSWORD_RESET_PATH
```

不得輸出變數值中的 Secret。修改 Vercel 變數後，舊 deployment 不會自動取得新值；必須建立新 deployment 或 Redeploy。

## Supabase Auth Email acceptance

確認：

- Reset Password template 使用 `{{ .ConfirmationURL }}`。
- `AUTH_SITE_URL + AUTH_PASSWORD_RESET_PATH` 形成實際 callback。
- Supabase Redirect URLs 明確允許 Local／Preview／Production callback。
- 使用修改設定後新寄出的信；舊信不代表新設定。
- 點擊後到 `/password/reset`，URL 可能帶 hash token 或 PKCE `code`。
- Recovery session 成功後敏感 URL 值被清除。
- 更新密碼後回 `/login?reason=password-updated`，舊密碼與同一連結失效。

不要把完整 ConfirmationURL、token、code 或 Session 貼進報告。

## Browser acceptance matrix

在獲得測試帳號與環境授權後，依序驗證：

1. Platform Owner：登入後進入 `/platform`；可列出 active organizations；未選機構時不顯示 tenant data。
2. Platform Owner：選 Organization A、再切到 B；名稱和資料同步切換，A 資料不殘留；tenant mutation 被拒絕。
3. Organization A Owner：顯示 A 名稱，只能存取 A。
4. Organization B Owner：顯示 B 名稱，只能存取 B。
5. Forged organization ID／平台 route：tenant actor 被拒絕或回 404，不洩漏另一機構是否存在。
6. Audit：平台檢視進 `platform_audit_logs`；機構操作進 `audit_logs`。
7. Session：登出後受保護頁面回登入；Preview、Production、localhost Cookie 不假設共用。

若學生／班級頁仍為 Mock-backed，不能用它們宣稱 Supabase 持久化或跨裝置一致；在驗收結果中明確標記。

## Diagnosing failures

- Vercel generic server error：先讀 Runtime Logs 的第一個 app error，不以瀏覽器 generic message 猜原因。
- `AUTH_CONFIGURATION_INVALID`：檢查 provider 值、Supabase public config、server-only Secret、`AUTH_SITE_URL` 格式與部署 scope。
- `AUDIT_UNAVAILABLE`／`PLATFORM_AUDIT_WRITE_FAILED`：確認正確 Audit store、table、constraint、Secret 與 RLS／grant，不停用 Audit 規避。
- 密碼信回首頁／登入：比較新信中經遮蔽的 `redirect_to`，檢查 Site URL、Redirect URLs、Template 與部署後新寄信。
- 首次慢、重整變快：記錄 Vercel／Supabase cold start；每次都慢則用 Runtime Logs 與 Supabase Query Performance 定位 sequential queries、region 或 index。

## Reporting

部署驗收回報至少包含：

- deployment 類型與 branch，不暴露 Secret。
- 測過的 persona／organization matrix。
- 通過的 route、讀取、拒絕、寫入與 Audit 行為。
- 哪些功能仍為 Mock-backed。
- 未執行的 Production mutation、RLS integration 或真實 Email 項目及原因。
