# LearnTrack 工程與 Clean Code 規範

本文件是 LearnTrack 的程式碼維護標準。它同時提供給人類開發者、Codex 與 OpenCode 使用。

## 1. 核心目標

我們優先追求：

- 容易找到程式碼。
- 容易理解資料從哪裡來、會寫到哪裡。
- 容易測試業務規則。
- 容易將 Mock Repository 替換成 Supabase。
- 避免跨組織資料外洩。
- 新功能不需要複製既有邏輯。

Clean Code 不等於把每個函式拆得很小，也不以固定行數作為品質標準。判斷依據是責任是否單一、名稱是否清楚、依賴方向是否正確，以及行為是否可驗證。

## 2. 依賴方向

允許的主要依賴方向：

```text
UI / Page
   ↓
Action / Route Handler
   ↓
Service
   ↓
Repository Interface
   ↓
Mock 或 Supabase Repository
   ↓
Database
```

簡單唯讀頁面可以省略 Action 與 Service：

```text
Server Page → Repository → Data Source
```

禁止的依賴：

```text
Client Component → Mock Fixtures
Client Component → Supabase Server Client
Client Component → Service Role Key
UI Component → PostgreSQL Row Type
Repository → React Component
```

## 3. 目錄與模組

業務功能優先依 Feature 分組：

```text
src/features/<feature>/
├─ components/
├─ <feature>.types.ts
├─ <feature>.schema.ts
├─ <feature>.service.ts
├─ <feature>.repository.ts
└─ tests/
```

不是所有 Feature 都必須具備全部檔案。只有存在對應責任時才新增：

- 沒有業務規則時，不強制建立 Service。
- 沒有外部輸入時，不強制建立 Schema。
- 沒有替代資料來源或資料邊界時，不為了形式新增 Interface。

真正跨功能共用的 UI 放在 `src/components/ui/`；Dashboard Shell 等版型放在 `src/components/layout/`。帶有學生、班級、出席等業務語意的元件應留在對應 Feature。

## 4. 命名原則

- 元件與型別使用 `PascalCase`。
- 函式、變數、Hook 使用 `camelCase`。
- 檔案名稱使用一致的小寫 kebab-case，例如 `attendance-service.ts`。
- 布林值以 `is`、`has`、`can`、`should` 開頭。
- 查詢使用 `get`、`find`、`list`；寫入使用 `create`、`update`、`archive`、`assign`、`enroll`、`record`。
- 避免 `data`、`item`、`handleThing`、`processData` 等無法表達業務意圖的名稱。
- ID 名稱必須表達對象，例如 `studentId`、`classId`，不要只使用 `id` 傳遞多種實體。

## 5. UI 與 React

### 色彩語意

- 品牌與主要操作使用 `brand`、`brand-deep`、`brand-soft` token，不在 JSX 重複寫青綠色 Hex。
- 藍色只表示資訊、課堂紀錄與一般導覽；成功使用 emerald、警告使用 amber、錯誤／缺席／落後使用 red。
- slate 負責文字、框線與中性色。不要再加入新的 indigo、sky 或另一組主色系。
- 圖表與需要 inline color 的元件優先使用 `var(--brand)`，狀態資料色除外。

### Page

Page 負責：

- 取得初始資料。
- 組合功能區塊。
- 傳遞 View Model。

Page 不負責：

- 寫 SQL 或直接操作 Supabase Table。
- 實作複雜業務規則。
- 保存 service-role credential。

### Client Component

只有需要以下能力時才加上 `"use client"`：

- `useState`、`useEffect` 等 Browser State。
- 點擊、輸入、拖曳等互動。
- 只能在瀏覽器運作的套件。

Client Component 必須接收可序列化的 props，不得直接匯入 `src/server/`。

### 元件拆分

元件應在以下情況拆分：

- 同時處理兩個以上可獨立描述的 UI 責任。
- 區塊需要獨立測試。
- 區塊在多處重用。
- 大量條件判斷讓主要畫面流程難以閱讀。

不要只因為超過任意行數就拆分，也不要建立只包住一個元素且沒有語意的元件。

### 狀態

- 可由 props 或其他 state 推導的值，不另外儲存在 state。
- 搜尋與篩選結果使用純函式或 `useMemo` 推導。
- Server data 與尚未儲存的表單草稿要有明確區別。
- 樂觀更新失敗時必須能復原或重新抓取資料。

## 6. Domain、View Model 與資料庫型別

三種型別分開看待：

### Domain Entity

描述業務概念，例如 Student、Class、Enrollment、AttendanceRecord。

### Persistence Row

描述資料庫實際欄位，例如 snake_case、nullable 欄位與 join result。只能存在 Repository／Database 邊界附近。

### View Model

描述畫面真正需要的資料，例如：

```ts
interface StudentProgressRow {
  studentId: string;
  studentName: string;
  className: string;
  completionRate: number;
  latestScore: number | null;
  status: ProgressStatus;
}
```

UI 使用 View Model，不直接依賴 Supabase 產生的 Row 型別。

## 7. Repository

Repository 負責：

- 資料來源存取。
- SQL／Supabase 查詢與 JOIN。
- 分頁、排序與查詢條件。
- Persistence Row 到 Domain／View Model 的 mapping。

Repository 不負責：

- React UI 狀態。
- Toast 或畫面文字。
- 跨多步驟的業務決策。
- 信任 Client 傳入的角色或組織權限。

Repository 方法應接受明確的 Query Object：

```ts
interface ListStudentsQuery {
  organizationId: string;
  search?: string;
  classId?: string;
  status?: StudentStatus;
  page: number;
  pageSize: number;
}
```

不要讓 UI 知道 Mock 與 Supabase 實作差異。資料來源由 Composition Root 決定。

## 8. Service

Service 用於具有業務規則或多資料操作的流程，例如：

- 學生入班、轉班與退班。
- 老師指派班級。
- 點名送出與修改限制。
- 考卷發布、作答與批改。

Service 不應變成所有 Repository 方法的無意義轉接層。

好的 Service 方法名稱描述業務動作：

```text
enrollStudent
transferStudent
submitAttendance
publishAssessment
recordGrade
```

## 9. Action 與輸入驗證

Server Action／Route Handler 負責：

1. 讀取目前登入 Session。
2. 驗證輸入格式。
3. 建立 Actor／Request Context。
4. 呼叫 Service 或 Repository。
5. 將已知錯誤轉換成穩定回應。
6. 必要時重新驗證頁面或快取。

所有外部輸入都視為不可信，包括 URL 參數、FormData、JSON、Cookie 與 Client 傳入的 organization ID。

建議使用 Zod 驗證 Action 輸入，但在實際安裝前應透過對應 OpenSpec change 確認依賴。

## 10. 權限與多租戶

- 每筆租戶資料必須具備 `organizationId`／`organization_id`。
- Organization context 必須從登入身分與 membership 推導。
- Client 傳入的 organization ID 只能當查詢意圖，不能當權限證明。
- Service 做應用層權限判斷。
- Supabase RLS 做資料庫最終隔離。
- Service Role Key 不得進入 Browser bundle，也不得以 `NEXT_PUBLIC_` 命名。
- Repository 查詢必須明確帶入組織範圍，除非操作的是不屬於租戶的公開資料。

## 11. 統計與 Dashboard

- 畫面顯示的數字必須來自同一份權威資料來源。
- 不在 UI 寫死看似即時的學生數、出席率或平均分數。
- Mock 數據也必須能追溯到 Fixture 或明確標示為展示資料。
- 資料量增大後，聚合、分頁與排序移到資料庫或 Repository，不在 Browser 載入全部資料後計算。

## 12. 錯誤處理

預期錯誤使用穩定代碼：

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
INTERNAL_ERROR
```

- UI 顯示使用者能採取行動的訊息。
- Log 保存診斷資訊，但不把 SQL、Token 或內部堆疊顯示給使用者。
- 權限錯誤不得洩漏目標資料是否存在。
- 不使用空的 `catch`，也不將所有錯誤都轉成成功結果。

## 13. 測試

依風險選擇測試：

- 純函式：Unit Test。
- Repository mapping 與組織篩選：Repository Contract Test。
- Service 業務規則：Service Test。
- UI 篩選、空狀態與錯誤回饋：Component Test。
- 登入、RLS、跨角色權限：Integration Test。
- 關鍵使用流程：E2E Test。

測試觀察行為，不依賴內部函式名稱或 Tailwind class 細節。

修正 Bug 時，若能穩定重現，先加入會失敗的回歸測試，再修正實作。

## 14. 格式與自動檢查

目標指令：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

目前 `frontend/` 已配置 Prettier 與 Tailwind CSS class 排序插件：

- `pnpm format`：格式化 `frontend/src`。
- `pnpm format:check`：檢查 `frontend/src`，不修改檔案。

完成程式修改時應執行 `pnpm format:check`；需要修正格式時先執行 `pnpm format`。

完成程式修改時：

- Error 必須歸零。
- Warning 要明確報告並決定修正或記錄，不可稱為完全乾淨。
- 變更 Server／Client 邊界、Route、設定或依賴時必須執行 production build。

## 15. 文件同步

下列變更必須同步文件：

| 變更 | 更新文件 |
|---|---|
| 路由、Feature、核心檔案移動 | `docs/codemap.md` |
| Server／Client／Repository 邊界改變 | `docs/system-architecture.md` |
| UI 寫入、Action、Service 流程改變 | `docs/ui-backend-actions.md` |
| SQL、Auth、RLS、環境變數改變 | `frontend/docs/supabase-handoff.md` |

## 16. Review Checklist

提交或完成變更前確認：

- [ ] 名稱能表達業務意圖。
- [ ] 沒有把新的即時統計寫死在 UI。
- [ ] Client 沒有匯入 Server-only 程式碼。
- [ ] 外部輸入已在 Server Boundary 驗證。
- [ ] Organization 與角色不是只相信 Client。
- [ ] Repository 沒有洩漏資料庫 Row 給 UI。
- [ ] Service 存在是因為業務規則，而非形式上的轉接。
- [ ] Loading、Empty、Error 與手機版行為仍可用。
- [ ] 測試涵蓋本次改變的行為與權限風險。
- [ ] 相關文件已同步。
- [ ] 驗證指令已執行，warning 與未執行項目已如實回報。
