"use client";
import { useMemo, useState } from "react";
import { Check, ChevronRight, LockKeyhole, Shield, Users } from "lucide-react";
import { updateRoleAction } from "@/app/actions/access-actions";
import { Card } from "@/components/ui";
import type { PermissionDefinition, RoleView } from "../access-control.types";
import { MockNotice } from "./mock-notice";
export function RolesView({
  roles,
  permissions,
  canManage,
}: {
  roles: RoleView[];
  permissions: PermissionDefinition[];
  canManage: boolean;
}) {
  const [selectedId, setSelectedId] = useState(roles[0]?.id ?? "");
  const selectedRole = roles.find((role) => role.id === selectedId) ?? roles[0];
  const groups = useMemo(
    () => Object.entries(Object.groupBy(permissions, (item) => item.module)),
    [permissions],
  );
  if (!selectedRole)
    return <Card className="p-12 text-center text-slate-500">目前沒有可設定的角色。</Card>;
  const isEditable = canManage && !selectedRole.isSystem;
  return (
    <>
      <MockNotice />
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="h-fit p-3">
          <div className="flex items-center justify-between px-2 py-2">
            <div>
              <h2 className="font-bold">選擇角色</h2>
              <p className="text-xs text-slate-500">共 {roles.length} 種角色</p>
            </div>
            <Shield size={18} className="text-teal-700" />
          </div>
          <div className="mt-2 space-y-1">
            {roles.map((role) => (
              <button
                type="button"
                key={role.id}
                onClick={() => setSelectedId(role.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${role.id === selectedRole.id ? "border-teal-700 bg-teal-50 text-teal-900" : "border-transparent hover:bg-slate-50"}`}
              >
                <span
                  className={`grid size-8 place-items-center rounded-full ${role.id === selectedRole.id ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  <Shield size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm">{role.name}</b>
                  <small className="flex items-center gap-1 text-slate-500">
                    <Users size={11} />
                    {role.memberCount} 位成員
                  </small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </Card>
        <div>
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-start gap-4 border-b bg-gradient-to-r from-teal-50 to-white p-5">
              <span className="grid size-11 place-items-center rounded-full bg-teal-800 text-white">
                <Shield size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">{selectedRole.name}權限</h2>
                  {selectedRole.isSystem && (
                    <span className="pill bg-slate-100 text-slate-600">
                      <LockKeyhole size={11} />
                      系統角色
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">{selectedRole.description}</p>
              </div>
              <span className="text-xs text-slate-500">
                已啟用 {selectedRole.permissions.length} 項
              </span>
            </div>
            <form action={updateRoleAction} className="p-5">
              <input type="hidden" name="roleId" value={selectedRole.id} />
              <input type="hidden" name="version" value={selectedRole.version} />
              <div className="space-y-5">
                {groups.map(([module, items]) => (
                  <section key={module}>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-xs font-bold tracking-wide text-slate-600 uppercase">
                        {module}
                      </h3>
                      <span className="h-px flex-1 bg-slate-100" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {items?.map((permission) => (
                        <label
                          key={permission.code}
                          className={`flex items-center gap-3 rounded-xl border p-4 ${selectedRole.permissions.includes(permission.code) ? "border-teal-100 bg-teal-50/40" : "bg-white"}`}
                        >
                          <input
                            className="size-4 accent-teal-700"
                            type="checkbox"
                            name="permission"
                            value={permission.code}
                            defaultChecked={selectedRole.permissions.includes(permission.code)}
                            disabled={!isEditable}
                          />
                          <span className="min-w-0 flex-1">
                            <b className="block text-sm">{permission.label}</b>
                            <small className="text-slate-500">
                              {permission.dependsOn
                                ? `需先具備 ${permission.dependsOn}`
                                : "獨立權限"}
                            </small>
                          </span>
                          {selectedRole.permissions.includes(permission.code) && (
                            <Check size={15} className="text-teal-700" />
                          )}
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <p className="text-xs text-slate-500">
                  {selectedRole.isSystem
                    ? "系統角色權限固定，無法直接修改。"
                    : canManage
                      ? "儲存前會驗證權限相依關係。"
                      : "你只有檢視權限。"}
                </p>
                <button
                  disabled={!isEditable}
                  className="bg-brand hover:bg-brand-deep rounded-lg px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  儲存權限
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
