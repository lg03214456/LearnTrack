# LearnTrack Code Map

這份文件是程式碼地圖的入口。先判斷功能領域，再只開啟對應的子地圖，避免每次載入整個系統細節。

## 專案入口

```text
LearnTrack/
├─ docs/                         系統文件與功能 Code Map
├─ frontend/                     現行可部署的 Next.js 應用
│  ├─ docs/                      Supabase 交接文件
│  └─ src/
│     ├─ app/                    路由、Layout、Server Components、Actions
│     ├─ components/             全站 Shell 與共用 UI
│     ├─ features/               依功能分組的 UI、型別與互動
│     └─ server/                 Server-only Repository、Service、Mock、權限
├─ backend/                      預留，現行未使用
└─ openspec/                     規格、設計與任務紀錄
```

## 功能地圖

| 要處理的功能 | 子地圖 |
|---|---|
| 學生名單、個人資料、修課計畫、考試、課堂紀錄、學習進度 | [學生與學習紀錄](codemap/students.md) |
| 班級建立／編輯、入退班、排課、點名 | [班級與出缺席](codemap/classes-and-attendance.md) |
| 教材範本、版本、章節／考卷項目、拖曳排序 | [教材與課程範本](codemap/curriculum.md) |
| 帳號、角色、身分切換、權限政策、資料範圍 | [帳號與權限](codemap/access-control.md) |
| 登入、密碼 Email、Session、Owner 帳號治理、操作紀錄 | [認證與操作紀錄](codemap/authentication-and-audit.md) |

## 共用程式碼

| 想修改的內容 | 主要位置 |
|---|---|
| 左側選單、手機選單、使用者資訊 | `frontend/src/components/shell.tsx` |
| 共用卡片、標籤、進度條 | `frontend/src/components/ui.tsx` |
| 全站顏色、表格、輸入框樣式 | `frontend/src/app/globals.css` |
| 頁面標題、說明、第二層麵包屑 Tree | `frontend/src/components/page-header.tsx` |
| Loading／Error 畫面 | `frontend/src/app/(dashboard)/loading.tsx`、`error.tsx` |
| 共用 Domain／View Model | `frontend/src/server/domain/types.ts` |
| Dashboard 與學習指標查詢 | `frontend/src/server/repositories/dashboard.ts` |
| 學習進度與分析 View Model | `frontend/src/features/progress/progress.types.ts`、`frontend/src/features/analytics/analytics.types.ts` |
| Supabase 串接策略 | `frontend/docs/supabase-handoff.md` |

## 新功能放置原則

```text
src/app/(dashboard)/<feature>/page.tsx       Server 頁面入口
src/features/<feature>/components/          功能 UI 與互動
src/features/<feature>/<feature>.types.ts   Client-safe contracts
src/server/repositories/<feature>.ts         資料存取合約／查詢入口
src/server/repositories/<feature>-core.ts    可獨立測試的純查詢邏輯
src/server/services/<feature>.ts             有寫入或業務規則時才加入
src/app/actions/<feature>-actions.ts          需要 Server Action 時加入
```

Client Component 不直接引用 `src/server/data/`、Server Action 實作、資料庫 client 或 service-role key。頁面透過 Repository 取得資料，寫入則由 Action／Service 驗證後處理。
