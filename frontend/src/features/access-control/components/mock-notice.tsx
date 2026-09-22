export function MockNotice() {
  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <b>開發用假帳號</b>
      <p className="mt-1">
        目前變更只保存在執行中的 Mock 資料，尚未連接 Supabase Auth 與 RLS，請勿存放正式資料。
      </p>
    </div>
  );
}
