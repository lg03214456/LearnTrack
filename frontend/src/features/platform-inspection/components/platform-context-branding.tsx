import { Eye, GraduationCap } from "lucide-react";

export function PlatformContextBranding({
  organizationName,
  action,
}: {
  organizationName?: string;
  action?: React.ReactNode;
}) {
  const title = organizationName ?? "LearnTrack 平台管理";
  return (
    <>
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <span className="bg-brand rounded-lg p-2 text-white">
            <GraduationCap />
          </span>
          <div>
            <b>{title}</b>
            <small className="block text-slate-500">Platform Owner・唯讀管理</small>
          </div>
          {action && <div className="ml-auto">{action}</div>}
        </div>
      </header>
      {organizationName && (
        <div
          role="status"
          className="border-b border-sky-200 bg-sky-50 px-6 py-3 text-center text-sm font-semibold text-sky-900"
        >
          <Eye className="mr-2 inline" size={17} />
          正在唯讀檢視：{organizationName}｜所有新增、修改與刪除操作均已停用
        </div>
      )}
    </>
  );
}
