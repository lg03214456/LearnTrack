# Supabase Auth、Email 與 Audit 正式串接交接

目前登入、Session、Email 連結與 Audit 已透過 server-only contracts 隔離，開發環境使用可重設 Mock adapter。公開部署前必須建立 Supabase 專案與寄件身分，且不可讓 Production 回退到 Mock。

## 需要由專案持有人提供的綁定資料

| 項目                      | 用途                          | 放置位置                        | 可否進 Browser         |
| ------------------------- | ----------------------------- | ------------------------------- | ---------------------- |
| Supabase Project URL      | Auth／PostgreSQL API 位址     | Environment variable            | 可以                   |
| Supabase publishable key  | Browser 建立一般 Auth session | Environment variable            | 可以，仍受 RLS 約束    |
| Supabase service-role key | Owner 帳號建立與管理          | Server secret only              | 不可以                 |
| SMTP host／port           | Supabase Auth 寄信            | Supabase Dashboard              | 不可以                 |
| SMTP username／password   | 寄件服務認證                  | Supabase Dashboard              | 不可以                 |
| Sender email／name        | 密碼設定與復原信寄件者        | Supabase Auth Email 設定        | Email 可公開，憑證不可 |
| Site URL／Redirect URLs   | 限制 Email callback 目的地    | Supabase Auth URL Configuration | 可以                   |

不得提交 `.env*`、service-role key、SMTP 密碼、使用者密碼、reset token 或完整重設連結。Preview 與 Production 使用不同 Secret；若 Preview 會碰到真實資料，需使用獨立 Supabase 專案。

## 環境變數

```text
LEARNTRACK_AUTH_PROVIDER=supabase
LEARNTRACK_EMAIL_PROVIDER=smtp
LEARNTRACK_AUDIT_PROVIDER=postgres
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
AUTH_SITE_URL=
AUTH_PASSWORD_RESET_PATH=/password/reset
```

SMTP host、port、username、password、Sender email 與 Sender name 只設定在 Supabase Dashboard 的 Authentication → Emails → SMTP Settings，不複製到 LearnTrack 或 Vercel 環境變數。`LEARNTRACK_EMAIL_PROVIDER=smtp` 代表由 Supabase Auth 使用該 Dashboard SMTP 設定寄送驗證與密碼郵件。

本機 Mock 模式可明確設定三個 provider 為 `mock`；Production 設為 Mock 或缺少正式設定時，登入頁會安全停用，不會自動授予 Owner。

## Auth／Email provider 接線（已完成）

- `src/lib/supabase/public-config.ts` 集中驗證 Project URL 與 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`；不讀取或相容 legacy anon key 名稱。
- `src/lib/supabase/browser-client.ts` 提供重設密碼 callback 使用的公開 Supabase client。
- `LEARNTRACK_AUTH_PROVIDER=supabase` 使用 Supabase Auth 登入與 Session；`LEARNTRACK_EMAIL_PROVIDER=smtp` 透過 Supabase Auth 的 `resetPasswordForEmail` 使用 Dashboard SMTP。
- 忘記密碼、本人修改密碼與 Owner 重寄密碼連結共用 Email provider contract；callback 由 `AUTH_SITE_URL` 與 `AUTH_PASSWORD_RESET_PATH` 組成，不轉送應用程式 Mock token。`AUTH_PASSWORD_RESET_PATH` 未設定時預設為 `/password/reset`；只接受站內 `/...` path，拒絕外部 URL，避免 Email redirect 被導向未知網站。
- 忘記密碼畫面在成功送出後會顯示 60 秒倒數並停用重送按鈕；Server 也對同一個正規化 Email 實施 60 秒冷卻，Supabase 的 SMTP rate limit 仍是部署環境的最終寄信保護。
- `LEARNTRACK_AUDIT_PROVIDER`、正式 membership repository、audit migration 與 RLS 仍待下一階段完成。

## Local／Preview／Production 矩陣

| 環境           | Auth／Email／Audit       | 資料               | Redirect URL 範例                            | 規則                                         |
| -------------- | ------------------------ | ------------------ | -------------------------------------------- | -------------------------------------------- |
| Local Mock     | mock／mock／mock         | 假帳號、記憶體資料 | `http://localhost:3000/password/reset`       | 顯示永久 Mock 警示；不可放真實個資           |
| Local Supabase | supabase／smtp／postgres | 開發專案           | `http://localhost:3000/password/reset`       | 使用開發專案與測試寄件者                     |
| Preview        | supabase／smtp／postgres | 獨立 Preview 專案  | `https://<preview-domain>/password/reset`    | 禁止 service-role 暴露到 Browser bundle      |
| Production     | supabase／smtp／postgres | 正式專案           | `https://<production-domain>/password/reset` | RLS、備份、稽核與 Owner 驗收全部通過後才開放 |

## 上線時的 URL 同步步驟

每個環境的 callback URL 都必須同時在部署環境與 Supabase 登記。以正式網域 `https://app.example.com` 為例：

1. 在 Vercel 的 **Project → Settings → Environment Variables**，設定 `AUTH_SITE_URL=https://app.example.com`、`AUTH_PASSWORD_RESET_PATH=/password/reset`；將同一組 provider、Supabase URL／publishable key 與 Server-only `SUPABASE_SECRET_KEY` 設到 Production。Preview 使用自己的 Preview 專案與網域，不與正式資料共用。
2. 重新部署；環境變數不會套用到既有 deployment。
3. 在 Supabase **Authentication → URL Configuration**，將 **Site URL** 設成 `https://app.example.com`，並在 **Redirect URLs** 明確新增 `https://app.example.com/password/reset`。
4. 保留 Local 的 `http://localhost:3000/password/reset`；每一個要允許的 Preview 網域也要逐一加入對應 `/password/reset` URL，勿使用不受控萬用字元。
5. 從正式網站發送一次忘記密碼信，確認信內網址是正式網域、可開啟重設頁，並用新密碼登入；再確認 `audit_logs` 有對應的事件。

若未來要改路徑（例如 `/auth/reset-password`），只需同步修改 `AUTH_PASSWORD_RESET_PATH` 與 Supabase Redirect URL 的 path，再部署；不必修改程式碼。

## Supabase URL 設定

Supabase Auth 的 Site URL 設正式網域；Additional Redirect URLs 明確加入 Local、核准的 Preview domain 與 Production callback。不要使用不受控的萬用字元。自訂網域啟用後，需同步更新 `AUTH_SITE_URL`、Supabase Redirect URLs 與寄信模板。

## 正式資料模型與 RLS 最低要求

- `profiles.id` 維持內部穩定 ID；`auth_user_id uuid nullable unique` 連結 `auth.users.id`，不可用 Auth ID 取代既有歷史 FK。
- `organization_memberships` 保存 organization、role、status 與資料範圍；只有 active membership 能解析成 `AuthorizationContext`。
- `audit_events` 為 append-only，包含 organization、actor profile、action、resource、result、request correlation、safe metadata 與 timestamp。
- Browser 只能依 active membership 與 `audit.read` 讀取同 organization 稽核；Browser 不得 insert、update、delete audit。
- service-role 僅由 Server Action／Service 使用；所有動作仍需重新解析 Session 與 membership，不能因使用 service-role 而略過授權。

## 綁定與切換順序

1. 建立 Supabase 開發專案、Auth URL、SMTP sender 與 Secret。
2. 執行 membership／audit migration、constraints、indexes 與 RLS policy tests。
3. 實作並執行共用 provider contract tests。
4. Owner 逐筆比對既有 profile 與已驗證 Email；歧義、重複、停用或缺漏帳號保持 inactive。
5. 驗證登入、忘記密碼、強制重設、停用、Session 撤銷與 Audit 查閱。
6. 關閉 Mock，要求所有人重新登入；公開前確認頁面沒有 Mock switch 或測試帳密。

## 回復方式

切換前可回復到本機 Mock 測試；切換正式資料後，回復方式是暫停登入並部署上一個相容版本。不可在公開環境重新啟用 Mock Owner，也不可刪除已產生的 durable audit events。
