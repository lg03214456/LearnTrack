import {
  createAccountAction,
  manageAccountCredentialAction,
  updateAccountAction,
} from "@/app/actions/access-actions";
import { Card, Metric } from "@/components/ui";
import {
  ChevronDown,
  KeyRound,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import type { AccountDirectory, AccountRow } from "../access-control.types";
import { MockNotice } from "./mock-notice";

interface AccountsViewProps {
  data: AccountDirectory;
  canManageOwner: boolean;
  classes: { id: string; name: string }[];
}

interface AccountManagementProps {
  row: AccountRow;
  roles: AccountDirectory["roles"];
  canManageOwner: boolean;
}

function AccountManagement({ row, roles, canManageOwner }: AccountManagementProps) {
  const ownerProtected = row.roleId === "owner-role" && !canManageOwner;

  if (ownerProtected) {
    return <span className="text-xs font-medium text-slate-500">僅 Owner 可管理</span>;
  }

  return (
    <details className="group relative">
      <summary className="hover:border-brand/40 hover:bg-brand-soft focus-visible:outline-brand inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition focus-visible:outline-2 focus-visible:outline-offset-2">
        <MoreHorizontal size={16} aria-hidden="true" />
        管理
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="absolute top-11 right-0 z-20 w-[min(24rem,calc(100vw-3rem))] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl">
        <div className="mb-4">
          <p className="font-bold text-slate-950">管理 {row.name}</p>
          <p className="mt-1 text-xs text-slate-500">角色與狀態會影響可使用的功能及資料範圍。</p>
        </div>

        <form
          action={updateAccountAction}
          className="grid gap-3 border-b pb-4 sm:grid-cols-[1fr_auto]"
        >
          <input type="hidden" name="membershipId" value={row.id} />
          <label className="text-xs font-semibold text-slate-600">
            角色
            <select name="roleId" defaultValue={row.roleId} className="input mt-1 w-full">
              {roles
                .filter((role) => canManageOwner || role.id !== "owner-role")
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
            </select>
          </label>
          <button className="btn-primary justify-center self-end">儲存角色</button>
        </form>

        {canManageOwner && (
          <form action={manageAccountCredentialAction} className="mt-4 space-y-3 border-b pb-4">
            <input type="hidden" name="membershipId" value={row.id} />
            <label className="block text-xs font-semibold text-slate-600">
              登入信箱
              <input
                name="email"
                type="email"
                defaultValue={row.email}
                aria-label={`${row.name}登入信箱`}
                className="input mt-1 w-full"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                name="operation"
                value="email"
                className="rounded-lg border px-3 py-2 text-xs font-bold"
              >
                <Mail size={14} aria-hidden="true" /> 更新信箱
              </button>
              <button
                name="operation"
                value="setup"
                className="rounded-lg border px-3 py-2 text-xs font-bold"
              >
                重寄設定信
              </button>
              <button
                name="operation"
                value="recovery"
                className="rounded-lg border px-3 py-2 text-xs font-bold"
              >
                <KeyRound size={14} aria-hidden="true" /> 重設密碼
              </button>
              <button
                name="operation"
                value="revoke"
                className="rounded-lg border px-3 py-2 text-xs font-bold"
              >
                撤銷登入
              </button>
            </div>
          </form>
        )}

        <form action={updateAccountAction} className="mt-4 flex items-center justify-between gap-4">
          <input type="hidden" name="membershipId" value={row.id} />
          <input
            type="hidden"
            name="status"
            value={row.status === "active" ? "inactive" : "active"}
          />
          <p className="text-xs text-slate-500">
            {row.status === "active"
              ? "停用後將無法登入，歷史資料仍會保留。"
              : "重新啟用此帳號的登入權限。"}
          </p>
          <button className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">
            {row.status === "active" ? "停用帳號" : "啟用帳號"}
          </button>
        </form>
      </div>
    </details>
  );
}

export function AccountsView({ data, canManageOwner, classes }: AccountsViewProps) {
  return (
    <>
      <MockNotice />
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="帳號總數" value={data.summary.total} icon={Users} />
        <Metric label="啟用帳號" value={data.summary.active} icon={UserCheck} />
        <Metric label="停用帳號" value={data.summary.inactive} icon={UserX} tone="red" />
      </div>

      {canManageOwner && (
        <details className="group mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
          <summary className="focus-visible:outline-brand flex cursor-pointer list-none items-center justify-between gap-4 p-5 focus-visible:outline-2 focus-visible:outline-offset-2">
            <span>
              <span className="flex items-center gap-2 font-bold text-slate-950">
                <Plus size={18} aria-hidden="true" className="text-brand" />
                新增登入帳號
              </span>
              <span className="mt-1 block text-sm text-slate-500">
                需要新增人員時再展開填寫，避免干擾日常帳號查找。
              </span>
            </span>
            <ChevronDown
              className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <form
            action={createAccountAction}
            className="grid gap-4 border-t bg-slate-50/60 p-5 md:grid-cols-2"
          >
            <label className="text-xs font-semibold text-slate-600">
              姓名
              <input
                name="name"
                required
                className="input mt-1 w-full"
                placeholder="例如：林老師"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              登入信箱
              <input
                name="email"
                type="email"
                required
                className="input mt-1 w-full"
                placeholder="name@example.com"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              初始密碼
              <input
                name="initialPassword"
                type="password"
                minLength={12}
                required
                className="input mt-1 w-full"
                placeholder="至少 12 個字元"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              角色
              <select name="roleId" required className="input mt-1 w-full">
                {data.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              初始狀態
              <select name="status" className="input mt-1 w-full">
                <option value="active">啟用</option>
                <option value="inactive">先停用</option>
              </select>
            </label>
            <fieldset className="md:col-span-2">
              <legend className="mb-2 text-xs font-semibold text-slate-600">
                可管理班級（全機構角色可留空）
              </legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {classes.map((item) => (
                  <label
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <input type="checkbox" name="classId" value={item.id} className="mr-2" />
                    {item.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex justify-end md:col-span-2">
              <button className="btn-primary justify-center px-6">建立帳號</button>
            </div>
          </form>
        </details>
      )}

      <Card className="mt-5 overflow-visible">
        <div className="border-b p-4">
          <div className="mb-3">
            <h2 className="font-bold text-slate-950">人員帳號</h2>
            <p className="mt-1 text-sm text-slate-500">先找到帳號，再展開該列的管理功能。</p>
          </div>
          <form className="flex flex-col gap-3 lg:flex-row">
            <label className="relative min-w-64 flex-1">
              <span className="sr-only">搜尋帳號</span>
              <Search
                className="pointer-events-none absolute top-3 left-3 text-slate-400"
                size={16}
              />
              <input
                name="search"
                aria-label="搜尋帳號"
                className="input w-full pl-9"
                placeholder="搜尋姓名或 Email..."
              />
            </label>
            <select name="roleId" aria-label="角色篩選" className="input">
              <option value="">全部角色</option>
              {data.roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <select name="status" aria-label="狀態篩選" className="input">
              <option value="">全部狀態</option>
              <option value="active">啟用</option>
              <option value="inactive">停用</option>
            </select>
            <button className="btn-primary justify-center px-5">搜尋</button>
          </form>
        </div>

        <div className="table-wrap overflow-visible">
          <table>
            <thead>
              <tr>
                <th>帳號</th>
                <th>角色與範圍</th>
                <th>狀態</th>
                <th className="w-28 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <b>{row.name}</b>
                    <small className="mt-1 block text-slate-500">{row.email}</small>
                  </td>
                  <td>
                    <span className="pill bg-slate-100 text-slate-700">
                      <ShieldCheck size={12} />
                      {row.roleName}
                    </span>
                    <small className="mt-2 block text-slate-500">{row.scopeLabel}</small>
                  </td>
                  <td>
                    <span
                      className={`pill ${
                        row.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          row.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                      {row.status === "active" ? "啟用" : "停用"}
                    </span>
                  </td>
                  <td className="text-right">
                    <AccountManagement
                      row={row}
                      roles={data.roles}
                      canManageOwner={canManageOwner}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.rows.length && (
          <div className="p-12 text-center text-slate-500">沒有符合條件的帳號</div>
        )}
        <div className="border-t p-4 text-xs text-slate-500">
          顯示 {data.rows.length} 筆，共 {data.pagination.total} 筆帳號
        </div>
      </Card>
    </>
  );
}
