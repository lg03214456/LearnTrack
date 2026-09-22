## Why

目前課程班級頁只能檢視既有班級並前往學生名單，管理者無法在系統內建立班級、配置週期排課、指派教師或維護班級生命週期。補齊班級管理邊界，才能讓 enrollment、每日應到名單、進度與歷史資料使用同一份可信來源。

## What Changes

- 擴充班級總覽卡片，顯示班級類型、科目、適用年級、教師、週期時段、地點、在班人數／上限與招生中／上課中／已結業狀態。
- 新增班級建立流程，支援名稱、班級類型、多科目、多年級或全年級、授課教師／導師與選填人數上限。
- 支援一個班級維護多筆每週重複時段，包含星期、開始／結束時間與選填教室。
- 建立班級時可搜尋並勾選既有學生，使用 enrollment 關聯加入；也可建立空班後續管理。
- 新增班級編輯、教師更換與 enrollment 維護，沿用共享學生名單而不建立第二套名冊。
- 採封存／結業作為第一版移除方式，保留既有出勤、成績、進度與 enrollment 歷史；第一版不提供永久刪除有歷史資料的班級。
- 排課規則成為每日點名應到名單的輸入來源；跨午夜時段與單次例外排課不納入第一版。
- 所有寫入經由 Server Action、Service、組織／角色範圍及 optimistic revision 驗證；現階段使用 resettable mock store，保留 Supabase transaction 與 RLS 替換邊界。

## Capabilities

### New Capabilities

- `class-management`: 班級總覽、建立、編輯、教師／學生指派、容量、狀態與安全封存。
- `recurring-class-schedules`: 每週重複時段、教室、時段驗證，以及提供每日點名應到班級／學生的排課查詢。

### Modified Capabilities

無。現有班級名單篩選仍沿用 `/students?classId=<id>` 合約；相關規格尚未同步至主 specs，因此本變更僅建立可獨立審閱的新能力。

## Impact

- 影響 `/classes` 總覽、班級建立／編輯路由、class feature components、Server Actions、service、repository 與 mock relations。
- 擴充 RBAC 對 `classes.manage` 的應用層檢查；教師僅能管理其被指派班級，負責人／管理員可建立與封存班級。
- 新增 class subjects、grade scopes、weekly schedule slots、teacher assignments 與 enrollment mutation contracts。
- 未新增外部服務；正式上線仍需 Supabase schema、索引、transaction、audit log 與 RLS policies。
