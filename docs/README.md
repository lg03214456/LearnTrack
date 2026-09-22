# LearnTrack 開發文件

這個目錄是 LearnTrack 的系統文件入口，用來快速理解目前實作、程式位置、資料流，以及下一階段後端與 Supabase 串接方式。

## 文件索引

| 文件 | 用途 |
|---|---|
| [工程與 Clean Code 規範](./engineering-standards.md) | 查看命名、分層、權限、測試與完成檢查標準 |
| [系統架構](./system-architecture.md) | 查看目前與未來架構、前後端邊界及部署關係 |
| [Code Map](./codemap.md) | 從功能快速找到頁面、元件、型別、假資料與 Repository |
| [UI 與後端操作流程](./ui-backend-actions.md) | 查看每個 UI 操作如何讀取或修改資料 |
| [Supabase 串接交接](../frontend/docs/supabase-handoff.md) | 查看資料表、索引、Auth、RLS 與 Repository 替換順序 |

## 目前技術狀態

- 前端與後端邏輯放在同一個 `frontend/` Next.js 專案。
- 頁面使用 Next.js App Router 與 Server Components 取得初始資料。
- 搜尋、篩選、出缺席切換等互動由 Client Components 處理。
- `src/server/` 是伺服器端程式邊界，不是獨立部署的後端服務。
- 資料目前來自 Mock Repository，尚未連接 Supabase。
- `backend/` 目前保留，第一階段不啟用。

## 閱讀順序

第一次接觸專案時，建議依序閱讀：

1. [工程與 Clean Code 規範](./engineering-standards.md)
2. [系統架構](./system-architecture.md)
3. [Code Map](./codemap.md)
4. [UI 與後端操作流程](./ui-backend-actions.md)
5. [Supabase 串接交接](../frontend/docs/supabase-handoff.md)
