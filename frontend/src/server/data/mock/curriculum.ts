import { ORG } from "@/server/repositories/dashboard";
import type {
  TemplateItemType,
  VersionStatus,
  PlanStatus,
  LearningStatus,
} from "@/features/curriculum/curriculum.types";
export interface CurriculumTemplate {
  id: string;
  organizationId: string;
  name: string;
  gradeId: string;
  subjectId: string;
  publisherId: string;
  isArchived: boolean;
}
export interface TemplateVersion {
  id: string;
  organizationId: string;
  templateId: string;
  number: number;
  status: VersionStatus;
  revision: number;
}
export interface TemplateItem {
  id: string;
  organizationId: string;
  versionId: string;
  parentId?: string;
  type: TemplateItemType;
  title: string;
  position: number;
}
export interface StudyPlan {
  id: string;
  organizationId: string;
  studentId: string;
  termId: string;
  gradeId: string;
  subjectId: string;
  versionId: string;
  status: PlanStatus;
  replacedPlanId?: string;
}
export interface StudentLearningItem {
  id: string;
  organizationId: string;
  planId: string;
  sourceItemId?: string;
  type: TemplateItemType;
  title: string;
  position: number;
  status: LearningStatus;
  isCustom: boolean;
  note?: string;
  updatedAt?: string;
  updatedBy?: string;
  revision: number;
}
export const grades = [
    { id: "g7", name: "國一" },
    { id: "g8", name: "國二" },
    { id: "g9", name: "國三" },
  ],
  subjects = [
    { id: "math", name: "數學" },
    { id: "english", name: "英文" },
    { id: "physics", name: "理化" },
  ],
  publishers = [
    { id: "hanlin", name: "翰林" },
    { id: "kanghsuan", name: "康軒" },
    { id: "custom", name: "自編教材" },
  ],
  terms = [
    { id: "115-1", name: "115-1" },
    { id: "115-2", name: "115-2" },
  ];
const initialTemplates: CurriculumTemplate[] = [
  {
    id: "tpl-math",
    organizationId: ORG,
    name: "國二數學標準進度",
    gradeId: "g8",
    subjectId: "math",
    publisherId: "hanlin",
    isArchived: false,
  },
  {
    id: "tpl-eng",
    organizationId: ORG,
    name: "國二英文核心課程",
    gradeId: "g8",
    subjectId: "english",
    publisherId: "kanghsuan",
    isArchived: false,
  },
  {
    id: "tpl-phy",
    organizationId: ORG,
    name: "國三理化自編",
    gradeId: "g9",
    subjectId: "physics",
    publisherId: "custom",
    isArchived: false,
  },
];
const initialVersions: TemplateVersion[] = [
  {
    id: "ver-math-1",
    organizationId: ORG,
    templateId: "tpl-math",
    number: 1,
    status: "published",
    revision: 1,
  },
  {
    id: "ver-math-2",
    organizationId: ORG,
    templateId: "tpl-math",
    number: 2,
    status: "draft",
    revision: 1,
  },
  {
    id: "ver-eng-1",
    organizationId: ORG,
    templateId: "tpl-eng",
    number: 1,
    status: "published",
    revision: 1,
  },
  {
    id: "ver-phy-1",
    organizationId: ORG,
    templateId: "tpl-phy",
    number: 1,
    status: "published",
    revision: 1,
  },
];
const seed = (versionId: string, prefix: string, titles: string[]): TemplateItem[] =>
  titles.flatMap((title, i) => {
    const unit = `${prefix}-unit-${i}`;
    return [
      {
        id: unit,
        organizationId: ORG,
        versionId,
        type: "unit",
        title: `單元 ${i + 1}　${title}`,
        position: i * 2,
      },
      {
        id: `${prefix}-ch-${i}`,
        organizationId: ORG,
        versionId,
        parentId: unit,
        type: i === titles.length - 1 ? "assessment" : "chapter",
        title: i === titles.length - 1 ? `${title} 隨堂考` : `${title} 基礎章節`,
        position: i * 2 + 1,
      },
    ];
  });
const initialItems = [
  ...seed("ver-math-1", "m1", ["乘法公式", "一元二次方程式", "資料分析"]),
  ...seed("ver-math-2", "m2", ["乘法公式", "一元二次方程式", "統計"]),
  ...seed("ver-eng-1", "e1", ["Travel", "Health", "Environment"]),
  ...seed("ver-phy-1", "p1", ["力與運動", "功與能", "電流"]),
];
const initialPlans: StudyPlan[] = [
  {
    id: "plan-1",
    organizationId: ORG,
    studentId: "stu-1",
    termId: "115-1",
    gradeId: "g8",
    subjectId: "math",
    versionId: "ver-math-1",
    status: "active",
  },
  {
    id: "plan-2",
    organizationId: ORG,
    studentId: "stu-1",
    termId: "115-1",
    gradeId: "g8",
    subjectId: "english",
    versionId: "ver-eng-1",
    status: "active",
  },
  {
    id: "plan-3",
    organizationId: ORG,
    studentId: "stu-2",
    termId: "115-1",
    gradeId: "g8",
    subjectId: "math",
    versionId: "ver-math-1",
    status: "active",
  },
];
const initialLearningItems: StudentLearningItem[] = initialPlans.flatMap((plan) =>
  initialItems
    .filter((x) => x.versionId === plan.versionId)
    .map((x, i) => ({
      id: `${plan.id}-${x.id}`,
      organizationId: ORG,
      planId: plan.id,
      sourceItemId: x.id,
      type: x.type,
      title: x.title,
      position: x.position,
      status: i < 2 ? "completed" : i === 2 ? "in_progress" : "pending",
      isCustom: false,
      revision: 1,
    })),
);
let templates = structuredClone(initialTemplates),
  versions = structuredClone(initialVersions),
  items = structuredClone(initialItems),
  plans = structuredClone(initialPlans),
  learningItems = structuredClone(initialLearningItems);
export const curriculumStore = {
  grades,
  subjects,
  publishers,
  terms,
  get templates() {
    return templates;
  },
  get versions() {
    return versions;
  },
  get items() {
    return items;
  },
  get plans() {
    return plans;
  },
  get learningItems() {
    return learningItems;
  },
  reset() {
    templates = structuredClone(initialTemplates);
    versions = structuredClone(initialVersions);
    items = structuredClone(initialItems);
    plans = structuredClone(initialPlans);
    learningItems = structuredClone(initialLearningItems);
  },
  addTemplate(x: CurriculumTemplate) {
    templates = [...templates, x];
  },
  updateTemplate(x: CurriculumTemplate) {
    templates = templates.map((y) => (y.id === x.id ? x : y));
  },
  addVersion(x: TemplateVersion) {
    versions = [...versions, x];
  },
  updateVersion(x: TemplateVersion) {
    versions = versions.map((y) => (y.id === x.id ? x : y));
  },
  addItems(x: TemplateItem[]) {
    items = [...items, ...x];
  },
  updateItems(x: TemplateItem[]) {
    const ids = new Set(x.map((y) => y.id));
    items = [...items.filter((y) => !ids.has(y.id)), ...x];
  },
  addPlan(x: StudyPlan) {
    plans = [...plans, x];
  },
  updatePlan(x: StudyPlan) {
    plans = plans.map((y) => (y.id === x.id ? x : y));
  },
  addLearningItems(x: StudentLearningItem[]) {
    learningItems = [...learningItems, ...x];
  },
  updateLearningItem(x: StudentLearningItem) {
    learningItems = learningItems.map((y) => (y.id === x.id ? x : y));
  },
  replaceLearningItems(next: StudentLearningItem[]) {
    learningItems = structuredClone(next);
  },
};
export function replaceCurriculumVersionItems(versionId: string, next: TemplateItem[]) {
  items = [...items.filter((item) => item.versionId !== versionId), ...next];
}
