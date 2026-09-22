import type { AccountStatus, PermissionCode } from "@/features/access-control/access-control.types";
import { personaPermissionMatrix } from "@/features/access-control/persona-experiences";
import { ORG } from "./fixtures";

export interface AccessProfile {
  id: string;
  authUserId: string | null;
  name: string;
  email: string;
  createdByProfileId: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AccessRole {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  isSystem: boolean;
  version: number;
  permissions: PermissionCode[];
}

export interface AccessMembership {
  id: string;
  profileId: string;
  organizationId: string;
  roleId: string;
  status: AccountStatus;
  classIds: string[];
  studentId?: string;
  linkedStudentIds?: string[];
}

const PROFILE_CREATED_AT = "2026-08-01T00:00:00.000Z";
const profile = (id: string, name: string, email: string): AccessProfile => ({
  id,
  authUserId: `mock-auth-${id}`,
  name,
  email,
  createdByProfileId: "owner",
  createdAt: PROFILE_CREATED_AT,
});
const initialProfiles: AccessProfile[] = [
  profile("owner", "王校長", "owner@learntrack.test"),
  profile("director", "林主任", "director@learntrack.test"),
  profile("admin", "舊版管理員", "admin@learntrack.test"),
  profile("teacher", "林老師", "teacher@learntrack.test"),
  profile("student", "陳品妤", "student@learntrack.test"),
  profile("parent", "陳媽媽", "parent@learntrack.test"),
  profile("assistant", "吳助教", "assistant@learntrack.test"),
  profile("limited", "許檢視者", "viewer@learntrack.test"),
  profile("inactive", "停用教師", "inactive@learntrack.test"),
];
export const accessProfiles = initialProfiles.map((item) => ({ ...item }));

const initialRoles: AccessRole[] = [
  {
    id: "owner-role",
    organizationId: ORG,
    name: "Owner",
    description: "機構擁有者與最高治理權限",
    isSystem: true,
    version: 1,
    permissions: [...personaPermissionMatrix.owner],
  },
  {
    id: "director-role",
    organizationId: ORG,
    name: "主任",
    description: "全機構日常教務與帳號管理",
    isSystem: false,
    version: 1,
    permissions: [...personaPermissionMatrix.director],
  },
  {
    id: "teacher-role",
    organizationId: ORG,
    name: "老師",
    description: "指定班級教學與紀錄管理",
    isSystem: false,
    version: 1,
    permissions: [...personaPermissionMatrix.teacher],
  },
  {
    id: "student-role",
    organizationId: ORG,
    name: "學生",
    description: "僅能查看本人學習紀錄",
    isSystem: true,
    version: 1,
    permissions: [...personaPermissionMatrix.student],
  },
  {
    id: "parent-role",
    organizationId: ORG,
    name: "家長",
    description: "僅能查看已綁定孩子的學習紀錄",
    isSystem: true,
    version: 1,
    permissions: [...personaPermissionMatrix.parent],
  },
  {
    id: "assistant-role",
    organizationId: ORG,
    name: "助教",
    description: "測試相容用助教角色",
    isSystem: false,
    version: 1,
    permissions: [
      "students.read",
      "student_profiles.read",
      "assessment_history.read",
      "assessment_history.manage",
      "classes.read",
      "attendance.read",
      "progress.read",
      "curriculum.read",
      "study_plans.read",
    ],
  },
  {
    id: "viewer-role",
    organizationId: ORG,
    name: "檢視者",
    description: "測試相容用唯讀角色",
    isSystem: false,
    version: 1,
    permissions: [
      "students.read",
      "student_profiles.read",
      "assessment_history.read",
      "classes.read",
      "attendance.read",
      "progress.read",
      "curriculum.read",
      "study_plans.read",
    ],
  },
];

const initialMemberships: AccessMembership[] = [
  {
    id: "m-owner",
    profileId: "owner",
    organizationId: ORG,
    roleId: "owner-role",
    status: "active",
    classIds: [],
  },
  {
    id: "m-director",
    profileId: "director",
    organizationId: ORG,
    roleId: "director-role",
    status: "active",
    classIds: [],
  },
  {
    id: "m-admin",
    profileId: "admin",
    organizationId: ORG,
    roleId: "director-role",
    status: "active",
    classIds: [],
  },
  {
    id: "m-teacher",
    profileId: "teacher",
    organizationId: ORG,
    roleId: "teacher-role",
    status: "active",
    classIds: ["cls-1"],
  },
  {
    id: "m-student",
    profileId: "student",
    organizationId: ORG,
    roleId: "student-role",
    status: "active",
    classIds: [],
    studentId: "stu-1",
  },
  {
    id: "m-parent",
    profileId: "parent",
    organizationId: ORG,
    roleId: "parent-role",
    status: "active",
    classIds: [],
    linkedStudentIds: ["stu-1"],
  },
  {
    id: "m-assistant",
    profileId: "assistant",
    organizationId: ORG,
    roleId: "assistant-role",
    status: "active",
    classIds: ["cls-2"],
  },
  {
    id: "m-limited",
    profileId: "limited",
    organizationId: ORG,
    roleId: "viewer-role",
    status: "active",
    classIds: ["cls-3"],
  },
  {
    id: "m-inactive",
    profileId: "inactive",
    organizationId: ORG,
    roleId: "teacher-role",
    status: "inactive",
    classIds: ["cls-1"],
  },
];

const cloneRoles = () =>
  initialRoles.map((role) => ({ ...role, permissions: [...role.permissions] }));
const cloneMemberships = (): AccessMembership[] =>
  initialMemberships.map((membership) => ({
    ...membership,
    classIds: [...membership.classIds],
    linkedStudentIds: membership.linkedStudentIds ? [...membership.linkedStudentIds] : undefined,
  }));
const cloneProfiles = () => initialProfiles.map((item) => ({ ...item }));

export const accessStore = {
  profiles: cloneProfiles(),
  roles: cloneRoles(),
  memberships: cloneMemberships() as AccessMembership[],
  reset() {
    this.profiles = cloneProfiles();
    this.roles = cloneRoles();
    this.memberships = cloneMemberships();
  },
  addProfile(profile: AccessProfile) {
    this.profiles.push({ ...profile });
  },
  addMembership(membership: AccessMembership) {
    this.memberships.push({ ...membership, classIds: [...membership.classIds] });
  },
  updateMembership(membership: AccessMembership) {
    const index = this.memberships.findIndex((candidate) => candidate.id === membership.id);
    if (index >= 0) this.memberships[index] = { ...membership, classIds: [...membership.classIds] };
  },
  updateRole(role: AccessRole) {
    const index = this.roles.findIndex((candidate) => candidate.id === role.id);
    if (index >= 0) this.roles[index] = { ...role, permissions: [...role.permissions] };
  },
  updateProfile(profile: AccessProfile) {
    const index = this.profiles.findIndex((candidate) => candidate.id === profile.id);
    if (index >= 0) this.profiles[index] = { ...profile };
  },
  removeProfile(profileId: string) {
    this.profiles = this.profiles.filter((candidate) => candidate.id !== profileId);
  },
  removeMembership(membershipId: string) {
    this.memberships = this.memberships.filter((candidate) => candidate.id !== membershipId);
  },
};
