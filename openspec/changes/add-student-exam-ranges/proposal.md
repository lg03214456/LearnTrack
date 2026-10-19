## Why

目前學生頁只顯示整份修課計畫的完成率，無法表達個別學生某次段考的準備程度。學生來自不同學校、段考進度不一致，因此需要各自設定範圍，並由既有完成紀錄即時計算百分比。

## What Changes

- 在學生「修課進度」新增段考範圍的建立、編輯對話框，設定名稱、選填日期與學習項目。
- 範圍只使用該學生已指派的教材計畫；可在同一範圍勾選多份使用中教材的內容，各範圍獨立計算。
- 顯示段考名稱、日期、教材版本、已完成／總項目與完成率，不混入考卷分數。
- 使用獨立資料表持久化段考與選取項目，不刪除或覆寫修課進度；更換教材後保留舊範圍，提示檢查是否需調整。
- 沿用機構隔離、學生 scope、修課計畫讀寫權限、Audit、版本衝突檢查與 Mock／Supabase provider 邊界。

## Capabilities

### New Capabilities

- `student-exam-ranges`: 學生個別段考範圍的建立、修改、查閱、持久化、授權與依範圍計算完成率。

### Modified Capabilities

無。既有修課計畫的更換、學習狀態更新與考卷成績規則保持不變。

## Impact

- 學生修課進度 UI、client-safe contracts、typed Server Actions、service、repository 與 provider adapters。
- 新增 additive Supabase migration、tenant／學生關聯 constraints、RLS 與原子 RPC，不新增環境變數。
- 新增 component／service／repository／SQL／隔離資料庫測試與使用者驗收流程。
- 不自動修改共享資料庫，不建立真實段考資料、不自動 commit／push；班級共用範圍、分數加權、通知與自動跨版本搬移不在本次範圍。
