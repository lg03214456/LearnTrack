# 帳號與權限 Code Map

## 路由

| URL | 主要用途 | 入口／畫面 |
|---|---|---|
| `/settings/accounts` | 帳號搜尋、角色與狀態管理 | `frontend/src/app/(dashboard)/settings/accounts/page.tsx`、`features/access-control/components/accounts-view.tsx` |
| `/settings/roles` | 角色權限矩陣與操作導引 | `frontend/src/app/(dashboard)/settings/roles/page.tsx`、`features/access-control/components/roles-view.tsx` |

## 資料與政策

| 責任 | 主要位置 |
|---|---|
| RBAC 型別與管理 UI | `frontend/src/features/access-control/` |
| Owner、主任、老師、學生、家長體驗 | `frontend/src/features/access-control/persona-experiences.ts` |
| Mock 身分解析 | `frontend/src/server/auth/identity.ts`、`identity-core.ts` |
| 權限目錄、角色政策、資料範圍 | `frontend/src/server/authorization/` |
| Mock profile、membership、本人／親子綁定 | `frontend/src/server/data/mock/access.ts` |
| 帳號／角色寫入規則 | `frontend/src/server/services/access-service.ts` |

權限要分成四個問題：目前是誰、具有什麼角色、能執行什麼操作、能存取哪些資料。側邊欄與按鈕隱藏只改善體驗；Repository、Service／Action 及未來 Supabase RLS 仍需再次驗證。

## 主要測試

- `persona-policy.test.ts`：五種身分的允許／拒絕與資料範圍。
- 搜尋 `frontend/src` 內的 `access*.test.*`、`identity*.test.*` 與 `authorization*.test.*`，確認帳號寫入及政策異動的對應測試。

Supabase Auth、RLS 或資料表實作請同時更新 `frontend/docs/supabase-handoff.md`。
