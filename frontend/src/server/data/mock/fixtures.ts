import type { AttendanceRow } from "@/features/attendance/attendance.types";
import type { ProgressRow } from "@/features/progress/progress.types";
import type { ClassRow, StudentRecord } from "@/server/domain/types";

export const ORG = "org-001";

export const students: StudentRecord[] = [
  {
    id: "stu-1",
    organizationId: ORG,
    number: "STU-0001",
    name: "陳品妤",
    gender: "女",
    phone: "0912-345-678",
    status: "active",
  },
  {
    id: "stu-2",
    organizationId: ORG,
    number: "STU-0002",
    name: "林子軒",
    gender: "男",
    phone: "0923-456-789",
    status: "active",
  },
  {
    id: "stu-3",
    organizationId: ORG,
    number: "STU-0003",
    name: "王若晴",
    gender: "女",
    phone: "0934-567-890",
    status: "leave",
  },
  {
    id: "stu-4",
    organizationId: ORG,
    number: "STU-0004",
    name: "張語涵",
    gender: "女",
    phone: "0955-321-808",
    status: "active",
  },
  {
    id: "stu-5",
    organizationId: ORG,
    number: "STU-0005",
    name: "李承恩",
    gender: "男",
    phone: "0966-124-557",
    status: "active",
  },
  {
    id: "stu-6",
    organizationId: ORG,
    number: "STU-0006",
    name: "許哲維",
    gender: "男",
    phone: "0977-633-210",
    status: "active",
  },
];

export const classRows: ClassRow[] = [
  {
    id: "cls-1",
    organizationId: ORG,
    name: "國中數學 A班",
    code: "MATH-J-001",
    grade: "國中",
    subject: "數學",
    schedule: "每週一、四 18:30－20:30",
    capacity: 32,
    status: "active",
    teacherName: "林老師",
    students: 0,
    progress: 65,
  },
  {
    id: "cls-2",
    organizationId: ORG,
    name: "國中英文 B班",
    code: "ENG-J-002",
    grade: "國中",
    subject: "英文",
    schedule: "每週二、五 18:30－20:30",
    capacity: 28,
    status: "active",
    teacherName: "陳老師",
    students: 0,
    progress: 42,
  },
  {
    id: "cls-3",
    organizationId: ORG,
    name: "高中物理進階班",
    code: "PHY-S-001",
    grade: "高中",
    subject: "物理",
    schedule: "每週六 09:00－12:00",
    capacity: 18,
    status: "attention",
    teacherName: "吳老師",
    students: 0,
    progress: 28,
  },
];

export const progressRows: ProgressRow[] = [
  ["stu-1", "陳品妤", "STU-0001", "國中數學 A班", 83, 10, 12, 91, "ahead", "今天"],
  ["stu-2", "林子軒", "STU-0002", "國中數學 A班", 68, 8, 12, 76, "normal", "昨天"],
  ["stu-3", "王若晴", "STU-0003", "國中數學 A班", 50, 6, 12, 62, "behind", "8/21"],
  ["stu-4", "張語涵", "STU-0004", "國中英文 B班", 75, 9, 12, 84, "normal", "8/20"],
  ["stu-5", "李承恩", "STU-0005", "國中英文 B班", 45, 5, 11, 69, "behind", "8/19"],
  ["stu-6", "許哲維", "STU-0006", "高中物理進階班", 80, 8, 10, 88, "ahead", "今天"],
].map((row) => ({
  studentId: row[0] as string,
  name: row[1] as string,
  number: row[2] as string,
  className: row[3] as string,
  progress: row[4] as number,
  completed: row[5] as number,
  total: row[6] as number,
  score: row[7] as number,
  status: row[8] as ProgressRow["status"],
  recent: row[9] as string,
}));

export const attendanceRows: AttendanceRow[] = [
  { studentId: "stu-1", name: "陳品妤", number: "STU-0001", status: "present", note: "加入候進—" },
  { studentId: "stu-2", name: "林子軒", number: "STU-0002", status: "late", note: "遲到 15 分鐘" },
  {
    studentId: "stu-3",
    name: "王若晴",
    number: "STU-0003",
    status: "absent",
    note: "無故未到，需聯絡家長",
  },
  {
    studentId: "stu-4",
    name: "張語涵",
    number: "STU-0004",
    status: "leave",
    note: "病假（已核准）",
  },
  { studentId: "stu-5", name: "李承恩", number: "STU-0005", status: "present", note: "" },
  { studentId: "stu-6", name: "許哲維", number: "STU-0006", status: "present", note: "" },
];
