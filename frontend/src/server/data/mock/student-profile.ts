import { ORG } from "@/server/data/mock/fixtures";
export interface StudentProfileRecord {
  studentId: string;
  organizationId: string;
  phone: string;
  school: string;
  grade: string;
  revision: number;
}
export interface GuardianRecord {
  id: string;
  organizationId: string;
  studentId: string;
  name: string;
  relationship: string;
  phone: string;
}
export interface StudentAssessment {
  id: string;
  organizationId: string;
  termId: string;
  subject: string;
  title: string;
  date: string;
  maximumScore: number;
}
export interface StudentAssessmentResult {
  id: string;
  organizationId: string;
  assessmentId: string;
  studentId: string;
  score: number;
  comment: string;
  revision: number;
  updatedAt: string;
  updatedBy: string;
}
export interface CourseSessionRecord {
  id: string;
  organizationId: string;
  studentId: string;
  classId: string;
  date: string;
  subject: string;
  attendance: "present" | "late" | "absent" | "leave";
  content: string;
  progress: string;
  score: number | null;
  comment: string;
  supersedesId?: string;
  correctionReason?: string;
}
const initialProfiles: StudentProfileRecord[] = [
  {
    studentId: "stu-1",
    organizationId: ORG,
    phone: "0912-345-678",
    school: "向學國中",
    grade: "國二",
    revision: 1,
  },
  {
    studentId: "stu-2",
    organizationId: ORG,
    phone: "0923-456-789",
    school: "向學國中",
    grade: "國二",
    revision: 1,
  },
  {
    studentId: "stu-3",
    organizationId: ORG,
    phone: "0934-567-890",
    school: "明德國中",
    grade: "國二",
    revision: 1,
  },
  {
    studentId: "stu-4",
    organizationId: ORG,
    phone: "0955-321-808",
    school: "明德國中",
    grade: "國二",
    revision: 1,
  },
  {
    studentId: "stu-5",
    organizationId: ORG,
    phone: "0966-124-557",
    school: "育才國中",
    grade: "國二",
    revision: 1,
  },
  {
    studentId: "stu-6",
    organizationId: ORG,
    phone: "0977-633-210",
    school: "第一高中",
    grade: "高一",
    revision: 1,
  },
];
const initialGuardians: GuardianRecord[] = [
  {
    id: "guardian-1",
    organizationId: ORG,
    studentId: "stu-1",
    name: "陳媽媽",
    relationship: "母親",
    phone: "0988-111-001",
  },
  {
    id: "guardian-2",
    organizationId: ORG,
    studentId: "stu-2",
    name: "林爸爸",
    relationship: "父親",
    phone: "0988-111-002",
  },
  {
    id: "guardian-3",
    organizationId: ORG,
    studentId: "stu-3",
    name: "王媽媽",
    relationship: "母親",
    phone: "0988-111-003",
  },
];
const initialAssessments: StudentAssessment[] = [
  {
    id: "exam-m1",
    organizationId: ORG,
    termId: "115-1",
    subject: "數學",
    title: "乘法公式小考",
    date: "2026-08-05",
    maximumScore: 100,
  },
  {
    id: "exam-m2",
    organizationId: ORG,
    termId: "115-1",
    subject: "數學",
    title: "一元二次方程式",
    date: "2026-08-19",
    maximumScore: 50,
  },
  {
    id: "exam-e1",
    organizationId: ORG,
    termId: "115-1",
    subject: "英文",
    title: "Travel 單元測驗",
    date: "2026-08-12",
    maximumScore: 100,
  },
];
const initialResults: StudentAssessmentResult[] = [
  {
    id: "result-1",
    organizationId: ORG,
    assessmentId: "exam-m1",
    studentId: "stu-1",
    score: 88,
    comment: "觀念清楚",
    revision: 1,
    updatedAt: "2026-08-05T12:00:00Z",
    updatedBy: "teacher",
  },
  {
    id: "result-2",
    organizationId: ORG,
    assessmentId: "exam-m2",
    studentId: "stu-1",
    score: 46,
    comment: "計算穩定",
    revision: 1,
    updatedAt: "2026-08-19T12:00:00Z",
    updatedBy: "teacher",
  },
  {
    id: "result-3",
    organizationId: ORG,
    assessmentId: "exam-e1",
    studentId: "stu-1",
    score: 82,
    comment: "單字需複習",
    revision: 1,
    updatedAt: "2026-08-12T12:00:00Z",
    updatedBy: "teacher",
  },
  {
    id: "result-4",
    organizationId: ORG,
    assessmentId: "exam-m1",
    studentId: "stu-2",
    score: 76,
    comment: "",
    revision: 1,
    updatedAt: "2026-08-05T12:00:00Z",
    updatedBy: "teacher",
  },
];
const initialSessions: CourseSessionRecord[] = [
  {
    id: "session-1",
    organizationId: ORG,
    studentId: "stu-1",
    classId: "cls-1",
    date: "2026-08-24",
    subject: "數學",
    attendance: "present",
    content: "一元二次方程式應用題",
    progress: "完成講義 p.42–48，訂正例題 3–6",
    score: 90,
    comment: "列式正確，計算速度可再提升",
  },
  {
    id: "session-2",
    organizationId: ORG,
    studentId: "stu-1",
    classId: "cls-2",
    date: "2026-08-22",
    subject: "英文",
    attendance: "late",
    content: "Travel 單元閱讀與文法",
    progress: "完成課本 p.36–41 與單字測驗",
    score: 82,
    comment: "遲到 10 分鐘，單字需持續複習",
  },
  {
    id: "session-3",
    organizationId: ORG,
    studentId: "stu-1",
    classId: "cls-1",
    date: "2026-08-20",
    subject: "數學",
    attendance: "present",
    content: "一元二次方程式公式解",
    progress: "完成講義 p.35–41，隨堂練習 8/10",
    score: 80,
    comment: "公式代入穩定",
  },
  {
    id: "session-4",
    organizationId: ORG,
    studentId: "stu-1",
    classId: "cls-2",
    date: "2026-08-15",
    subject: "英文",
    attendance: "leave",
    content: "Travel 單元文法",
    progress: "請假，尚未完成本次內容",
    score: null,
    comment: "安排下次補課",
  },
];
let profiles = structuredClone(initialProfiles),
  guardians = structuredClone(initialGuardians),
  assessments = structuredClone(initialAssessments),
  results = structuredClone(initialResults),
  sessions = structuredClone(initialSessions);
export const studentProfileStore = {
  get profiles() {
    return profiles;
  },
  get guardians() {
    return guardians;
  },
  get assessments() {
    return assessments;
  },
  get results() {
    return results;
  },
  get sessions() {
    return sessions;
  },
  reset() {
    profiles = structuredClone(initialProfiles);
    guardians = structuredClone(initialGuardians);
    assessments = structuredClone(initialAssessments);
    results = structuredClone(initialResults);
    sessions = structuredClone(initialSessions);
  },
  updateProfile(record: StudentProfileRecord) {
    profiles = profiles.map((x) => (x.studentId === record.studentId ? record : x));
  },
  addProfile(record: StudentProfileRecord) {
    profiles = [...profiles, record];
  },
  updateGuardian(record: GuardianRecord) {
    guardians = guardians.map((x) => (x.id === record.id ? record : x));
  },
  addResult(record: StudentAssessmentResult) {
    results = [...results, record];
  },
  updateResult(record: StudentAssessmentResult) {
    results = results.map((x) => (x.id === record.id ? record : x));
  },
};
