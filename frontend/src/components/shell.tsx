"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Library,
  Menu,
  Settings,
  Shield,
  ShieldCheck,
  TrendingUp,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { selectPersona } from "@/app/actions/access-actions";
import { logoutAction } from "@/app/actions/authentication-actions";
import type {
  AuthorizationContext,
  PermissionCode,
} from "@/features/access-control/access-control.types";
import {
  personaExperiences,
  personaOptions,
  type PersonaKey,
} from "@/features/access-control/persona-experiences";
type NavItem = { href: string; label: string; icon: typeof Users; permission: PermissionCode };
const teachingNav: NavItem[] = [
  { href: "/students", label: "學生名單", icon: Users, permission: "students.read" },
  { href: "/progress", label: "學生進度", icon: TrendingUp, permission: "progress.read" },
  {
    href: "/curriculum/templates",
    label: "教材範本庫",
    icon: Library,
    permission: "curriculum.read",
  },
  { href: "/classes", label: "課程班級", icon: BookOpen, permission: "classes.read" },
  { href: "/attendance", label: "出缺席", icon: CalendarCheck, permission: "attendance.read" },
  { href: "/analytics", label: "學習指標", icon: BarChart3, permission: "analytics.read" },
];
const systemNav: NavItem[] = [
  { href: "/settings/accounts", label: "帳號管理", icon: UserCircle, permission: "accounts.read" },
  { href: "/settings/roles", label: "角色權限", icon: Shield, permission: "roles.read" },
  { href: "/settings/audit", label: "操作紀錄", icon: ShieldCheck, permission: "audit.read" },
];
const scopeLabel = (actor: AuthorizationContext) =>
  actor.scope.kind === "organization-wide"
    ? "全機構"
    : actor.scope.kind === "assigned-classes"
      ? "指定班級"
      : actor.scope.kind === "self-student"
        ? "僅本人"
        : "已綁定孩子";
function NavigationGroup({
  label,
  items,
  path,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  path: string;
  onNavigate: () => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-6">
      <p className="px-2 text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">
        {label}
      </p>
      <nav className="mt-2 space-y-1">
        {items.map((item) => {
          const isActive = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-brand text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-900",
              )}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
export function Shell({
  children,
  actor,
  isMockMode,
}: {
  children: React.ReactNode;
  actor: AuthorizationContext;
  isMockMode: boolean;
}) {
  const path = usePathname(),
    [open, setOpen] = useState(false),
    experience = personaExperiences[actor.profileId as PersonaKey] ?? personaExperiences.owner;
  const visibleTeaching = teachingNav.filter((item) => actor.permissions.includes(item.permission)),
    visibleSystem = systemNav.filter((item) => actor.permissions.includes(item.permission));
  return (
    <div className="min-h-screen">
      <button
        aria-label="開啟選單"
        onClick={() => setOpen(true)}
        className="bg-brand fixed top-4 left-4 z-40 rounded-lg p-2 text-white lg:hidden"
      >
        <Menu />
      </button>
      {open && (
        <button
          aria-label="關閉選單遮罩"
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 p-4 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/students"
            aria-label="返回學生名單主頁"
            onClick={() => setOpen(false)}
            className="focus-visible:outline-brand flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <span className="bg-brand rounded-lg p-2 text-white">
              <GraduationCap />
            </span>
            <div>
              <b>補教紀錄</b>
              <small className="block text-[10px] tracking-wide text-slate-500">PROGRESS HUB</small>
            </div>
          </Link>
          <button
            aria-label="關閉選單"
            className="ml-auto lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <NavigationGroup
          label="教學功能"
          items={visibleTeaching}
          path={path}
          onNavigate={() => setOpen(false)}
        />
        <div className="mt-auto pt-6">
          {isMockMode && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
              <b>Mock 身分與操作導引</b>
              <p className="my-2 text-amber-800">僅供開發驗證，不是真實登入。</p>
              <form action={selectPersona}>
                <select
                  name="persona"
                  aria-label="切換假帳號"
                  defaultValue={actor.profileId}
                  className="input w-full text-xs"
                  onChange={(event) => event.currentTarget.form?.requestSubmit()}
                >
                  {personaOptions
                    .filter((option) => option.profileId !== "inactive")
                    .map((option) => (
                      <option key={option.profileId} value={option.profileId}>
                        {option.label}｜{option.scopeSummary}
                      </option>
                    ))}
                </select>
              </form>
              <p className="mt-3 border-t border-amber-200 pt-3">
                <b>{experience.roleName}</b>・{experience.scopeSummary}
              </p>
              <Link
                className="text-brand mt-2 inline-block font-semibold underline"
                href={experience.recommendedRoute}
              >
                建議從「{experience.recommendedLabel}」開始
              </Link>
            </div>
          )}
          <NavigationGroup
            label="系統設定"
            items={visibleSystem}
            path={path}
            onNavigate={() => setOpen(false)}
          />
          <div className="mt-3 flex items-center gap-3 border-t pt-3 text-xs">
            <span className="grid size-8 place-items-center rounded-full bg-slate-900 text-white">
              <Settings size={14} />
            </span>
            <Link href="/settings/profile" className="min-w-0 hover:underline">
              <b>{actor.name}</b>
              <small className="block text-slate-500">
                {actor.roleName}・{scopeLabel(actor)}
              </small>
            </Link>
            <form action={logoutAction} className="ml-auto">
              <button className="font-semibold text-slate-500 hover:text-slate-900">登出</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-h-screen lg:pl-60">
        {isMockMode && (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-center text-xs font-semibold text-amber-900">
            Mock 開發模式｜資料與登入僅供測試，請勿輸入真實個資
          </div>
        )}
        <header className="h-16 border-b bg-white" />
        <div className="mx-auto max-w-[1440px] p-5 pt-7 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
