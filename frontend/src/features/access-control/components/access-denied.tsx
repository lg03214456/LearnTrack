import Link from "next/link";
import { Card } from "@/components/ui";
export function AccessDenied() {
  return (
    <Card className="p-12 text-center">
      <h1 className="text-xl font-bold">無權限存取</h1>
      <p className="mt-2 text-sm text-slate-500">目前角色沒有查看此功能的權限。</p>
      <Link
        href="/"
        className="bg-brand hover:bg-brand-deep mt-5 inline-flex rounded-lg px-4 py-2 text-sm font-bold text-white"
      >
        返回首頁
      </Link>
    </Card>
  );
}
