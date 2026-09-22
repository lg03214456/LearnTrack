# LearnTrack 程式碼審查報告

審查日期：2026-08-26
審查範圍：`frontend/` 完整專案（Next.js 16 + React 19 + TypeScript）

---

## 總體評估

| 維度 | 評分 | 說明 |
|------|------|------|
| 架構分層 | ⭐⭐⭐☆☆ | 有雛型但未落實 Feature-based 結構 |
| Clean Code | ⭐⭐☆☆☆ | 硬編碼多、命名不一致、UI 直接依賴 Domain 型別 |
| 單一職責 | ⭐⭐☆☆☆ | Components 混合資料邏輯與呈現 |
| 可測試性 | ⭐⭐☆☆☆ | 無 Service 層、Repository 直接回傳 View Model |
| 文件一致性 | ⭐⭐⭐☆☆ | `system-architecture.md` 與實際程式碼有落差 |

---

## 🔴 嚴重問題（必須修正）

### 1. **Client Component 直接匯入 Server-only Domain 型別** 違反架構邊界

**檔案**：`students-view.tsx:13`、`progress-view.tsx:12`、`analytics-view.tsx:11`、`attendance-view.tsx:11`、`classes-view.tsx:11`

```tsx
// 所有 Client Components 都這樣寫：
import type { StudentRow, ProgressRow, Analytics, ... } from "@/server/domain/types"
```

**問題**：
- `engineering-standards.md §2` 明確禁止：`Client Component → PostgreSQL Row Type`、`UI Component → Domain Entity`
- View Model 應由 Server Component 組裝並傳遞給 Client Component
- 目前 UI 直接依賴 Repository 回傳的型別，未來換 Supabase 時 UI 必須全改

**建議**：
- Server Page 組裝 `ViewModel`（如 `StudentListItemVM`、`ProgressCardVM`）
- Client Component 只接收純資料 props（可序列化），不引用 `@/server/*`

---

### 2. **硬編碼假資料寫死在 UI 元件** 違反工程規範

**檔案**：`students-view.tsx:17-19`、`progress-view.tsx:19-22`、`analytics-view.tsx:19-22`

```tsx
// students-view.tsx
<Metric label="學生總數" value="156位" icon={Users}/>           // 寫死 156
<Metric label="在學學生" value="142位" icon={UserCheck}/>       // 寫死 142
<Metric label="本月新增" value="8位" icon={AlertCircle} />      // 寫死 8

// progress-view.tsx
value={rows.length * 4 + 4}   // 邏輯寫在 UI
sub="本週新增 3 位"           // 寫死字串
```

**問題**：
- `engineering-standards.md §11`：畫面顯示的數字必須來自同一份權威資料來源，不在 UI 寫死看似即時的統計
- Mock 數據也必須能追溯到 Fixture

**建議**：
- 所有統計數字由 Repository 計算並回傳 `DashboardStats` View Model
- UI 只負責顯示 `stats.totalStudents`、`stats.activeStudents`

---

### 3. **Repository 直接回傳 View Model，無 Domain ↔ View Model Mapping**

**檔案**：`dashboard.ts:1-41`

```ts
// 目前：MockRepository 方法直接回傳 ProgressRow、Analytics 等 View Model
async progress() { return progressRows }  // 直接回傳 fixtures 裡的 View Model
```

**問題**：
- `engineering-standards.md §7`：Repository 負責「Persistence Row 到 Domain／View Model 的 mapping」
- 目前 fixtures 就是 View Model，沒有 Domain Entity、Persistence Row 的分層
- 未來接 Supabase 時無法複用 mapping 邏輯

**建議**：
```
fixtures (Persistence Row) → Repository.mapToDomain() → Domain Entity
                                    → Repository.mapToViewModel() → View Model
```

---

### 4. **缺少 Service 層，業務規則散落在 UI**

**檔案**：`attendance-view.tsx:44-52`

```tsx
// 狀態切換邏輯直接寫在 onClick
onClick={() => setRows(x => x.map(a => 
  a.studentId === r.studentId ? { ...a, status: s } : a
))}
```

**問題**：
- `engineering-standards.md §8`：Service 用於具有業務規則或多資料操作的流程（如點名送出與修改限制）
- 目前沒有 `attendance.service.ts`，樂觀更新、衝突處理、權限檢查都在 UI

**建議**：
- 建立 `src/features/attendance/attendance.service.ts`
- Action → Service → Repository 流向

---

### 5. **硬編碼 ORG 常數，無多租戶架構**

**檔案**：所有 Page 都 `import { ORG } from "@/server/repositories/dashboard"`

```ts
// fixtures.ts
export const ORG = "org-001"
```

**問題**：
- `engineering-standards.md §10`：Organization context 必須從登入身分與 membership 推導
- Client 傳入的 organization ID 只能當查詢意圖，不能當權限證明
- 目前完全硬編碼，無法支援多組織

---

## 🟠 中等問題（建議重構）

### 6. **目錄結構未遵循 Feature-based 組織**

**現狀**：
```
src/
├── app/(dashboard)/          # 路由
├── components/
│   ├── views/                # 所有頁面級元件混在一起
│   ├── ui.tsx                # 共用 UI
│   └── shell.tsx
├── server/
│   ├── domain/types.ts       # 所有型別集中
│   ├── repositories/
│   └── data/mock/
```

**期望（依 engineering-standards.md §3）**：
```
src/features/
├── students/
│   ├── components/
│   ├── students.types.ts     # View Model
│   ├── students.service.ts
│   ├── students.repository.ts
│   └── tests/
├── progress/
├── attendance/
├── classes/
└── analytics/
```

**影響**：
- 相關檔案分散，難以維護
- 無法獨立開發/測試單一 Feature

---

### 7. **命名不一致、無法表達業務意圖**

| 現狀 | 問題 | 建議 |
|------|------|------|
| `StudentRow`、`ProgressRow` | 以資料庫 Row 命名，非 View Model | `StudentListItemVM`、`StudentProgressCardVM` |
| `dashboardRepository.students()` | 動詞不表達查詢意圖 | `listStudents(query)`、`findStudentById(id)` |
| `attendance-view.tsx` 的 `initial` prop | 不清楚是初始資料還是完整資料 | `initialRows` 或 `serverRows` |
| `q`、`cls` 狀態變數 | 單字母、縮寫 | `searchQuery`、`selectedClassName` |

---

### 8. **Client Component 狀態管理不當**

**檔案**：`attendance-view.tsx:11-12`

```tsx
const [rows, setRows] = useState(initial);  // 初始資料直接存入 state
```

**問題**：
- `engineering-standards.md §5.4`：Server data 與尚未儲存的表單草稿要有明確區別
- `initial` 來自 Server，應視為 read-only server data
- 樂觀更新應有獨立 `draftRows` 或 `pendingChanges`

**建議**：
```tsx
const [serverRows, setServerRows] = useState(initial);  // 只從 Server 更新
const [draftRows, setDraftRows] = useState<AttendanceRow[]>([]);  // 本地修改
const displayRows = useMemo(() => mergeRows(serverRows, draftRows), [serverRows, draftRows]);
```

---

### 9. **型別定義過度集中、缺乏語意區分**

**檔案**：`types.ts`（全部擠在一檔）

```ts
// 混雜：Domain Entity、Persistence Row、View Model、Enum
export type StudentStatus = ...
export interface Organization { ... }           // Domain
export interface StudentRow { ... }             // View Model（其實是給 UI 用）
export interface Enrollment { ... }             // Domain
export interface AttendanceRecord { ... }       // Persistence Row
```

**建議**：
```
src/server/domain/
├── entities.ts        # Student, Class, Enrollment, AttendanceRecord...
├── enums.ts           # StudentStatus, ProgressStatus...
├── view-models.ts     # StudentListItemVM, ProgressCardVM, AnalyticsVM...
└── persistence.ts     # (未來) Supabase Row types
```

---

### 10. **缺少輸入驗證、錯誤處理、權限檢查**

- 無 Zod schema 驗證（`engineering-standards.md §9` 建議使用）
- 無 Server Action / Route Handler（目前全靠 Server Component 直連 Repository）
- 無 Auth、無 RLS context
- `engineering-standards.md §12` 錯誤代碼未實作

---

## 🟢 較輕微問題（可漸進改善）

### 11. **UI 元件重複邏輯**

- `students-view`、`progress-view`、`classes-view` 都有相同的「搜尋 + 篩選 + 表格」模式
- 可抽象為 `DataTable`、`FilterBar` 共用元件

### 12. **ProgressBar、Status、Metric 等 UI 元件在 `ui.tsx` 混雜**

- 建議拆分：`ui/metric.tsx`、`ui/progress-bar.tsx`、`ui/status-badge.tsx`

### 13. **測試覆蓋率極低**

- 僅有 `relations.test.ts`、`fixtures.test.ts`（測試 mock 資料關聯）
- 缺：Repository Contract Test、Service Test、Component Test、E2E

### 14. **格式化工具未配置**

- `engineering-standards.md §14`：專案尚未配置 Prettier 與 `format:check`
- 程式碼風格不一（有分號/無分號、單引號/雙引號混用）

### 15. **文件同步缺口**

- `system-architecture.md` 宣稱有 `Action`、`Service` 層，但程式碼完全沒有
- `codemap.md` 未更新對應現有結構

---

## 📋 優先修正清單（建議執行順序）

| 優先級 | 任務 | 預估工時 | 相關規範 |
|--------|------|----------|----------|
| **P0** | Client Component 移除 `@/server/domain/types` 匯入，改用 View Model props | 4h | §2, §6 |
| **P0** | 所有硬編碼統計數字移至 Repository 回傳的 View Model | 3h | §11 |
| **P0** | Repository 引入 Domain Entity → View Model mapping | 4h | §7 |
| **P0** | 建立 `attendance.service.ts` 處理點名業務規則 | 3h | §8 |
| **P1** | 重構目錄為 Feature-based 結構 | 6h | §3 |
| **P1** | 型別拆分：entities / view-models / enums | 2h | §6 |
| **P1** | 命名規範化（查詢用 list/find，ID 帶實體前綴） | 2h | §4 |
| **P1** | Client state 分離：serverData vs draftData | 2h | §5.4 |
| **P2** | 配置 Prettier + ESLint + format:check | 1h | §14 |
| **P2** | 補齊測試：Repository Contract、Component、Service | 8h | §13 |
| **P2** | 更新 `system-architecture.md`、`codemap.md` 反映實際架構 | 1h | §15 |

---

## 🏗️ 建議的目標架構（對齊 engineering-standards.md）

```
src/
├── app/(dashboard)/              # Next.js Pages (Server Components)
│   ├── students/page.tsx         # 只負責：取得資料 → 組裝 ViewModel → 傳給 View
│   ├── progress/page.tsx
│   ├── classes/page.tsx
│   ├── attendance/page.tsx
│   └── analytics/page.tsx
│
├── features/
│   ├── students/
│   │   ├── components/
│   │   │   ├── students-view.tsx        # Client: 只收 ViewModel、處理互動
│   │   │   ├── student-list.tsx
│   │   │   └── student-filters.tsx
│   │   ├── students.types.ts       # StudentListItemVM, StudentFiltersVM
│   │   ├── students.repository.ts  # Interface + Mock/Supabase 實作
│   │   ├── students.service.ts     # 業務規則（如：轉班、退學）
│   │   └── students.actions.ts     # Server Actions（驗證輸入、權限）
│   │
│   ├── progress/
│   ├── attendance/
│   ├── classes/
│   └── analytics/
│
├── components/
│   ├── ui/                         # 純 UI、無業務邏輯
│   │   ├── metric.tsx
│   │   ├── progress-bar.tsx
│   │   ├── status-badge.tsx
│   │   └── data-table.tsx
│   └── layout/
│       └── shell.tsx
│
├── server/
│   ├── domain/
│   │   ├── entities.ts             # Student, Class, Enrollment...
│   │   ├── enums.ts                # StudentStatus, ProgressStatus...
│   │   ├── view-models.ts          # 給 UI 用的扁平化型別
│   │   └── persistence.ts          # Supabase Row types (未來)
│   ├── repositories/
│   │   └── interfaces.ts           # 所有 Repository Interface
│   └── data/mock/
│       ├── fixtures.ts             # Persistence Row 風格的假資料
│       ├── relations.ts            # 關聯資料
│       └── mappers.ts              # Persistence → Domain → ViewModel
│
└── lib/
    ├── auth.ts                     # Session、Actor、權限
    ├── validation.ts               # Zod schemas
    └── errors.ts                   # 錯誤代碼、處理
```

---

## 📝 下一步行動建議

1. **立即**：建立一個 OpenSpec change 追蹤這次重構（使用 `openspec-propose` skill）
2. **本週**：完成 P0 任務，確保架構邊界正確
3. **下週**：Feature-based 目錄重構 + 型別拆分
4. **持續**：配格式化工具、補測試、同步文件

---

> 此審查報告基於 `docs/engineering-standards.md`、`docs/system-architecture.md` 以及 Clean Code 原則。所有引用條款均可對應至工程規範文件對應章節。