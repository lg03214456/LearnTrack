import type { PermissionDefinition } from "@/features/access-control/access-control.types";
export const permissionCatalog: PermissionDefinition[] = [
  { code: "students.read", module: "學生管理", label: "查看學生" },
  { code: "students.manage", module: "學生管理", label: "管理學生", dependsOn: "students.read" },
  {
    code: "student_profiles.read",
    module: "學生管理",
    label: "查看個人資料",
    dependsOn: "students.read",
  },
  {
    code: "student_profiles.manage",
    module: "學生管理",
    label: "管理個人資料",
    dependsOn: "student_profiles.read",
  },
  {
    code: "assessment_history.read",
    module: "成績管理",
    label: "查看考試紀錄",
    dependsOn: "students.read",
  },
  {
    code: "assessment_history.manage",
    module: "成績管理",
    label: "登錄與修正成績",
    dependsOn: "assessment_history.read",
  },
  { code: "classes.read", module: "課程管理", label: "查看班級" },
  { code: "classes.manage", module: "課程管理", label: "管理班級", dependsOn: "classes.read" },
  { code: "attendance.read", module: "出缺席", label: "查看出缺席" },
  {
    code: "attendance.manage",
    module: "出缺席",
    label: "管理出缺席",
    dependsOn: "attendance.read",
  },
  { code: "progress.read", module: "進度管理", label: "查看進度" },
  { code: "progress.manage", module: "進度管理", label: "管理進度", dependsOn: "progress.read" },
  { code: "analytics.read", module: "分析報告", label: "查看分析" },
  { code: "accounts.read", module: "系統管理", label: "查看帳號" },
  { code: "accounts.manage", module: "系統管理", label: "管理帳號", dependsOn: "accounts.read" },
  { code: "roles.read", module: "系統管理", label: "查看角色" },
  { code: "roles.manage", module: "系統管理", label: "管理角色", dependsOn: "roles.read" },
  { code: "curriculum.read", module: "教材範本", label: "查看教材範本" },
  {
    code: "curriculum.manage",
    module: "教材範本",
    label: "管理教材範本",
    dependsOn: "curriculum.read",
  },
  { code: "study_plans.read", module: "修課計畫", label: "查看修課計畫" },
  {
    code: "study_plans.manage",
    module: "修課計畫",
    label: "管理修課計畫",
    dependsOn: "study_plans.read",
  },
  { code: "credentials.change_self", module: "登入安全", label: "修改自己的密碼" },
  {
    code: "credentials.force_reset",
    module: "登入安全",
    label: "強制重設密碼",
    dependsOn: "accounts.manage",
  },
  { code: "audit.read", module: "系統稽核", label: "查看操作紀錄" },
];
export function validatePermissionCatalog() {
  const codes = new Set(permissionCatalog.map((x) => x.code));
  return (
    codes.size === permissionCatalog.length &&
    permissionCatalog.every((x) => !x.dependsOn || codes.has(x.dependsOn))
  );
}
