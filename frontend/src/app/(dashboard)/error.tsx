"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="card p-12 text-center">
      <h2 className="text-xl font-bold">資料暫時無法載入</h2>
      <p className="mt-2 text-slate-500">請稍後再試，不會影響已儲存的資料。</p>
      <button
        onClick={reset}
        className="bg-brand hover:bg-brand-deep mt-5 rounded-lg px-4 py-2 text-white"
      >
        重新載入
      </button>
    </div>
  );
}
