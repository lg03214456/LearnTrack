# Supabase 串接交接

管理用環境變數統一採 `SUPABASE_SECRET_KEY`（`sb_secret_...`），僅供 Server 使用。
Supabase Auth 與 Email adapters 已完成；membership/audit schema 與 RLS migration 已建立在 `supabase/migrations/`，但在 migration、bootstrap 與資料庫行為測試完成前，填入 key 不代表可公開切換所有 provider。
由 Supabase Auth 寄送驗證信與密碼信時，SMTP 帳密只留在 Dashboard；LearnTrack 與 Vercel 不保存 SMTP 密碼。

登入、Email 與 Audit 的環境變數、Redirect URL、Secret 與切換矩陣，請先閱讀 [`../../docs/supabase-auth-audit-handoff.md`](../../docs/supabase-auth-audit-handoff.md)。

目前 Auth 與 Email 已可使用 Supabase：公開設定統一使用 `NEXT_PUBLIC_SUPABASE_URL` 與 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`，Server 管理操作使用 `SUPABASE_SECRET_KEY`，密碼 callback 使用 `AUTH_SITE_URL`。SMTP sender 與憑證由 Supabase Dashboard 管理。啟用 Supabase Auth 時，登入後會由 `profiles`、active membership、role 與 permission 表解析 organization-wide Owner；啟用 PostgreSQL Audit 時，操作紀錄會改寫入 `audit_logs`。老師、學生與聯絡人的 relationship-scoped 資料仍由 Mock repository 提供，因此在這些 repository 完成 Supabase migration 前會安全地拒絕登入，不會誤給全機構資料權限。

Domain repository 由 `LEARNTRACK_DOMAIN_DATA_PROVIDER` 選擇 `mock` 或 `supabase`。Production 必須明確設為 `supabase`，缺少設定或指定 `mock` 都會 fail closed；Local 單元測試可使用 `mock`。在所有 Supabase adapters 完成接線前，不要把尚未完成的 feature 宣稱為持久化完成。

## PostgreSQL 資料表

第一階段 migration 建立 `organizations`、`profiles`、`organization_memberships`、`roles`、`permissions`、`role_permissions`、`membership_roles`、`students`、`course_classes`、`class_enrollments`、`class_assignments`、`student_user_links`、`student_contacts` 與 `audit_logs`。既有 Mock 使用的 organization、profile、student、class 等穩定 ID 保留為 `text`；只有 Supabase `auth.users.id` 與新關聯流水 ID 使用 UUID。所有租戶關聯透過 `organization_id` 與複合 foreign key 防止跨機構關聯。

Migration 執行順序：

1. `202609160001_identity_membership_and_audit.sql`
2. `202609160002_row_level_security.sql`
3. 初始 Owner bootstrap（依環境選擇 Auth user，不把 Email 或 UUID寫死在共用 migration）
4. `202609290001_platform_owner_read_access.sql`
5. `202610020001_student_class_persistence.sql`
6. `202610020002_student_class_functions.sql`
7. `202610020003_student_class_contract_alignment.sql`

學生名單與班級管理已由 `LEARNTRACK_DOMAIN_DATA_PROVIDER` 切換 Mock／Supabase adapter。Supabase 模式下，名單與班級頁面使用登入者 access token 讓 RLS 判斷範圍；學生、Enrollment 與班級 aggregate 寫入分別呼叫 `save_student_aggregate`、`change_student_lifecycle`、`save_class_aggregate`。學生個人頁的聯絡人、評量與課堂歷史仍待後續 schema，尚未切換。

### 初始 Owner bootstrap

在 Dashboard 的 **Authentication → Users** 確認第一位登入者已存在且 Email 已驗證後，開啟 SQL Editor：

1. 複製 `supabase/bootstrap/initialize-first-owner.sql` 的內容。
2. 只替換開頭的 `v_owner_email`、`v_owner_display_name`、`v_organization_id` 與 `v_organization_name`；不要把 SMTP 密碼、Supabase secret key 或登入密碼放入 SQL。
3. 執行一次。此工具會建立 organization、profile、active membership、Owner role、該角色所有既有 permission 的 organization-wide assignment，以及一筆不可修改的 bootstrap audit log。
4. 執行 `supabase/bootstrap/verify-first-owner.sql`。預期第一個查詢只回傳一筆 `membership_status = active`、`role_name = Owner`，且 `permission_count = catalog_permission_count`；第二個查詢應回傳 `account.bootstrap_owner` 稽核紀錄。

如 bootstrap 顯示 `No rows returned`，表示尚未建立 Owner；如果出現例外訊息，transaction 會自動 rollback，不會留下半套資料。已有 organization、已連結 profile、未驗證 Email 或缺少 permission catalog 時，請先停下來查明原因，不要重複或修改後硬跑。

## 索引

- Membership、role、student、class 與 relationship 表依實際 RLS lookup 建立 organization、status、profile、student、class 複合索引。
- `students (organization_id, student_number)` unique
- `students` 增加 `status`（`active`／`leave`／`archived`）、nullable `archived_at`、`archived_by`、`archive_reason`。一般名單預設排除 `archived`，但學號唯一性仍包含已封存資料。
- 封存學生必須在 transaction 內寫入封存稽核欄位並結束所有 active Enrollment；不刪除成績、出勤、修課計畫或個人 Profile。恢復時先設為 `leave`，不自動恢復 Enrollment。
- `enrollments (organization_id, student_id, class_id)` unique
- `attendance_records (organization_id, session_id, student_id)` unique
- 常用排序：`lesson_progress (organization_id, updated_at desc)`

## Auth 與角色

`profiles.id` 是穩定的內部 actor ID，nullable unique `profiles.auth_user_id` 才對應 `auth.users.id`。一個 membership 可透過 `membership_roles` 擁有多個角色；`role_permissions.scope_kind` 讓同一 permission 分別採 organization-wide、assigned-classes、self-student 或 linked-students 範圍。老師透過 `class_assignments`、學生透過 `student_user_links`、中性的登入聯絡人透過 `student_contacts` 限制資料範圍。這些關聯都由 server／database 決定，不接受瀏覽器提交的 studentId 或 linkedStudentIds 作為授權證明。

目前 Cookie persona 與記憶體 Mock Store 只供 UI／政策測試。正式資料上線前必須替換成 Supabase Session、持久化權限表與 RLS；Service role key 不得交給 Browser。

## RLS 原則

| 資料       | Owner／主任                              | 老師           | 學生               | 登入聯絡人     |
| ---------- | ---------------------------------------- | -------------- | ------------------ | -------------- |
| 組織內學生 | 讀寫，包含有權查看的停用學生             | 僅授課班級     | 僅 active 本人唯讀 | 僅綁定學生唯讀 |
| 出缺席     | 讀寫                                     | 僅授課班級讀寫 | 僅 active 本人唯讀 | 僅綁定學生唯讀 |
| 成績與進度 | 讀寫                                     | 僅授課班級讀寫 | 僅 active 本人唯讀 | 僅綁定學生唯讀 |
| 帳號／角色 | Owner 全權；主任不可管理 Owner／系統角色 | 拒絕           | 拒絕               | 拒絕           |

所有 policy 先驗證 active membership 與 `organization_id`，再依 permission 的 `scope_kind` 驗證該筆資源關係，不能只相信前端傳入的角色。多角色只合併 permission，不合併成一個寬鬆的資料範圍。學生停用或 `student_user_links` 停用時只撤銷 student-self scope，不自動撤銷同 membership 的其他有效角色。Service role key 僅能存在 server environment。

## 替換順序

1. 建立 Supabase 專案與 migration。
2. 建立 Auth、membership、RLS policy 及 policy 測試。
3. 設定 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`；服務端密鑰僅在下一階段確有管理工作且完成 server-only adapter 時新增。不依賴 legacy anon key 名稱。
4. 實作 `SupabaseDashboardRepository`，維持現有 `DashboardRepository` 回傳型別。
5. 在 repository composition root 依環境切換 mock／Supabase。
6. 分頁逐一比對 JOIN 結果與 mock 畫面，通過後才關閉 mock fallback。

# Curriculum handoff

新增資料表建議：`curriculum_templates`、`template_versions`、`template_items`、`study_plans`、`student_learning_items`。所有表必須含 `organization_id`；RLS 以 membership、role permission 與 class enrollment 限制讀寫。發布版本不可更新內容，啟用修課計畫時需在 transaction 內建立學生項目快照。前端不直接查表，維持 repository/service 邊界。

### Template item mutation transaction

- `template_versions` 使用 `revision integer not null default 1`；寫入以 version、organization、draft status 與 revision 鎖定，未命中視為衝突或不可存取。
- `template_items` 建立 deferred unique constraint `(organization_id, version_id, position)`，以及索引 `(organization_id, version_id, position, id)`。
- 刪除與相鄰交換在同一 transaction 完成 position 壓縮及 revision 遞增，不能暴露中途狀態。
- RLS 驗證 active membership 與 `curriculum.manage`，再驗證 version/template organization；發布或封存版本由 policy 或 trigger 阻擋 mutation。
- 建議以 append-only `curriculum_item_audits` 記錄 action、before/after position、actor 與時間；mock 目前只保留最新狀態。

## Student profile and assessment history handoff

- `student_profiles`: `student_id` unique FK、`organization_id` FK、`school`、`grade`、`phone`、`revision integer not null default 1`。
- `guardians`: `organization_id`、`student_id` FK、姓名、關係與電話；索引 `(organization_id, student_id)`。
- `assessments`: `term_id`、`subject_id`、名稱、日期、`maximum_score > 0`；索引 `(organization_id, term_id, subject_id, assessment_date desc)`。
- `assessment_results`: assessment/student FK、score、comment、revision、updated_at/by；unique `(organization_id, assessment_id, student_id)`，trigger 驗證 `0 <= score <= maximum_score`，索引 `(organization_id, student_id, updated_at desc)`。
- 建議另建 append-only `assessment_result_audits` 保存更正前後值、actor、時間與原因；mock 目前只保存最新值與最後更新者。

## 班級每日課堂與學生進度

班級不擁有教材版本；`student_study_plans` 才是學生版本來源。建議新增：

- `class_sessions(id, organization_id, class_id, session_date, schedule_id, teacher_profile_id, status, created_at, completed_at, revision)`
- `class_session_members(id, organization_id, class_session_id, student_id, enrollment_id, attendance_status)`
- `student_session_progress(id, organization_id, class_session_id, session_member_id, student_id, study_plan_id, learning_item_id, status_after_session, note, recorded_by, recorded_at, supersedes_id, correction_reason, revision)`

必要約束與索引：

- `class_sessions` 對 `(organization_id, class_id, session_date, schedule_id)` 建立符合多時段規則的唯一約束。
- 所有關聯同時驗證 `organization_id`；對 session/date、student/date、plan/item 與 `supersedes_id` 建立索引。
- `note` 為 nullable 受長度限制文字，不建立頁碼欄位，也不參與完成率。
- `supersedes_id` 必須指向同 organization、session、student、plan 與 item 的紀錄；更正原因必填。
- 完成課堂後的漏登紀錄可沒有 `supersedes_id`，但必須保存 `correction_reason`，並與同一批 session revision 更新一起寫入；既有紀錄內容更正仍必須使用 `supersedes_id`。

儲存一堂課的學生進度必須在同一 PostgreSQL transaction 中：先鎖定／比對 session 與 learning-item revision，驗證整批關係，append history，更新 `student_learning_items`，最後增加 session revision。任何一筆失敗即全部 rollback。

RLS 先檢查 active organization membership，再檢查 `progress.read/manage` 與 class assignment。老師只能存取被指派班級的 session，且 progress row 的 student 必須存在該 session member snapshot；student/guardian 僅能讀本人或已綁定學生歷史。Browser 不得提交 organization、role 或班級版本作為授權證明，service-role key 仍只存在 Server。

RLS 先驗證 active organization membership；organization-wide 角色依 permission 存取，assigned-class 角色透過 active `enrollments` 與 `class_assignments` 驗證學生在授課班級。家長資料不得出現在 roster query，只能在 detail scope 通過後 JOIN。前端傳入的 organization、actor 與滿分皆不可信。

替換順序：migration／constraints／RLS policy tests → Supabase `StudentDetailRepository` adapter → 將 service store 寫入換成 transaction。保留 View Model、permission code、command result 與 optimistic revision 行為。

## Class management and recurring schedules handoff

建議資料表：

- `classes`: `organization_id`、`name`、`code`、`class_type`、nullable `capacity`、`lifecycle_status`、`progress`、`revision`、`completed_at`、`archived_at`。
- `class_subjects`: class／subject FK；unique `(organization_id, class_id, subject_id)`。
- `subjects`: 各機構可選科目、顯示名稱、狀態與班級代碼前綴；由 RLS 限制機構範圍。
- `class_code_sequences`: 各機構、各前綴的最後流水號；只由 `save_class_aggregate` 原子更新。單科使用 `subjects.class_code_prefix`，多科使用 `MIX`，建立後班級代碼保持不變。
- `class_grade_scopes`: class／grade FK；全年級可用明確 `scope_type`，避免假 grade FK；同班只允許一種範圍策略。
- `class_teacher_assignments`: class／teacher FK、`started_at`、nullable `ended_at`；partial unique 確保同班只有一位 active primary teacher。
- `class_schedule_slots`: class FK、`weekday smallint check (weekday between 0 and 6)`、`start_time time`、`end_time time`、nullable `room`，並檢查 `end_time > start_time`；unique `(organization_id, class_id, weekday, start_time, end_time)`。
- `enrollments`: class／student FK、`status`、`started_at`、nullable `ended_at`；partial unique `(organization_id, class_id, student_id) where status = 'active'`，保留退班歷史。
- `class_audit_events`: append-only actor、class、action、before/after JSON、created_at，用於建立、修改、教師更換、入退班、結業與封存稽核。

常用索引包含 `(organization_id, lifecycle_status)`、schedule `(organization_id, weekday, class_id)`、active enrollment `(organization_id, class_id, student_id) where ended_at is null`、assignment `(organization_id, teacher_id, class_id) where ended_at is null`。班級 aggregate 建立與完整 replacement 應包在 PostgreSQL function／transaction；先以 `organization_id + class_id + revision` 鎖定並更新 `revision = revision + 1`，再替換關聯。任何 constraint 或容量檢查失敗都 rollback，不可讓 UI 逐表寫入。

每日應到名單查詢以本地日期轉成 weekday，JOIN `classes → class_schedule_slots → active enrollments → students`，只取 `lifecycle_status = 'active'`，並以 `(class_id, student_id)` 去重。已存在的 `attendance_sessions`／`attendance_records` 不回寫，因此後續修改排課只影響未來查詢。

RLS 必須先驗證 active organization membership。owner/admin 且具 `classes.manage` 可建立、修改、結業與封存；assigned teacher 只能讀取並修改 active 指派班級的允許欄位、排課及 enrollment，不能更換教師或改生命週期；其他角色唯讀或拒絕。所有 relationship policy 需透過 parent class 再驗證 organization，不能信任前端提交的 organization、role、teacher 或 revision。

## Platform Owner 與多機構檢視

依序套用 `202609160001_identity_membership_and_audit.sql`、`202609160002_row_level_security.sql`、`202609290001_platform_owner_read_access.sql`。Platform Owner 使用獨立的 `platform_operators`、`platform_permissions` 與 `platform_role_permissions`，不得同時持有 active organization membership；租戶 Owner 不會因此取得平台權限。

建立方式：先在 Supabase Auth 建立並驗證 Email，再建立／連結 `profiles`，最後複製 `initialize-platform-owner.sql`、替換其中的 placeholder Email 後於 SQL Editor 執行。腳本不包含密碼或 service key，重跑會更新同一 profile 的 operator 狀態。完成後應查核三項 platform permission 均存在。

平台只能列出 active organization，選定明確 organization ID 後唯讀檢視。RLS 只把 `platform.tenant_data.read` 加入 tenant SELECT policy；既有 INSERT／UPDATE policy 不含平台分支。每次進入或拒絕檢視均寫入 append-only `platform_audit_logs`。Browser 顯示的 organization 名稱一律重新由資料庫 ID 查得，不能信任 URL label 或 local storage。

回滾時先停用 `platform_operators.status`，確認無平台 session，再移除新增的 platform SELECT policies／函式／四張 platform tables；不可刪除 tenant schema 或 tenant audit。驗證至少準備 A、B 兩個機構：租戶 A 不得讀 B；Platform Owner 可讀 A、B 但所有 mutation 均拒絕；anonymous 全部拒絕；稽核需記錄每次目標切換。
