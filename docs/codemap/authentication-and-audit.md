# 認證與操作紀錄 Code Map

## 操作入口

| 功能 | Route／UI | Server Action |
|---|---|---|
| 登入／登出 | `src/app/login`、`features/authentication/components/login-form.tsx` | `authentication-actions.ts` |
| 忘記／設定密碼 | `src/app/password`、`features/authentication/components/*password*` | `authentication-actions.ts` |
| 個人修改密碼 | `src/app/(dashboard)/settings/profile` | `requestSelfPasswordChangeAction` |
| Owner 帳號管理 | `src/app/(dashboard)/settings/accounts`、`accounts-view.tsx` | `access-actions.ts` |
| 操作紀錄 | `src/app/(dashboard)/settings/audit` | Server page 直接查詢 scoped repository |

## Server 邊界

```text
UI → Server Action → Auth／Password／Account Service
                   → server/auth contracts
                   → Mock providers（目前）／Supabase adapters（待綁定）
                   → Session → Membership → AuthorizationContext

Material Action → Audit assertWritable → Domain mutation → append audit event
```

- Provider contracts：`src/server/auth/contracts.ts`
- Provider 設定與 production fail-closed：`provider-config.ts`
- Mock Auth／Email／Session／Password link／Membership：`mock-providers.ts`
- Supabase Auth／Email／Session adapter：`supabase-providers.ts`
- 登入身分解析：`identity.ts`、`identity-core.ts`
- Audit catalog、metadata 過濾與 wrappers：`src/server/audit/`
- Owner 帳號治理：`account-administration-service.ts`
- Supabase 綁定輸入：[Supabase Auth、Email 與 Audit 交接](../supabase-auth-audit-handoff.md)

Browser Component 不得匯入 `src/server/auth`、service-role key、SMTP credential、密碼、token 或完整 reset URL。`AuthorizationContext` 是 Auth provider 與應用 RBAC 之間的穩定合約。
