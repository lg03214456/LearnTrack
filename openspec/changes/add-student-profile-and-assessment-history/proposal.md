## Why

LearnTrack 的學生名單目前只能進入修課計畫，缺少完整個人資訊與可追溯的考試成績紀錄。老師需要在同一個學生頁快速理解基本資料、班級關係、學習計畫與歷次小考表現，並安全地登錄或修正成績。

## What Changes

- 擴充 `/students/[studentId]` 為學生個人頁，呈現基本資料、學校、年級、聯絡資訊、家長聯絡方式與班級歸屬。
- 新增考試定義與學生成績紀錄，包含科目、考試名稱、日期、得分、滿分與老師評語。
- 提供依學期、科目篩選的考試歷史、最新成績摘要與由成績紀錄推導的趨勢。
- 讓具有適當權限且可存取該學生的老師登錄與修改成績；唯讀使用者看不到寫入控制，Server 仍會拒絕無權操作。
- 維持 mock-first Repository／Service／Server Action 邊界，並記錄未來 Supabase PostgreSQL foreign keys、indexes 與 RLS 做法。
- 不包含線上作答、題庫、試題逐題分析、附件上傳、家長端或成績通知。

## Capabilities

### New Capabilities

- `student-profile`: 定義授權範圍內的學生個人資料、聯絡資料與班級歸屬查閱及維護行為。
- `assessment-history`: 定義考試資料、學生成績登錄、修改、歷史篩選、摘要與趨勢推導行為。

### Modified Capabilities

None.

## Impact

- 擴充學生個人頁的 View Model、UI 區塊、mock fixtures、repository、service、Server Actions 與測試。
- 新增學生個人資料及成績相關 permission codes，沿用既有 organization／assigned-class scope。
- 未來需要 Supabase `student_guardians`、`assessments`、`assessment_results` 等正規化資料表與 RLS；本 change 不建立正式 migration 或 Auth。
