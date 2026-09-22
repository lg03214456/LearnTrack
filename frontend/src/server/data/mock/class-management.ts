import { ORG, students } from "./fixtures";
import { enrollments as initialEnrollmentFixtures } from "./relations";
import { accessProfiles } from "./access";
import type {
  ClassLifecycle,
  ClassType,
  WeeklyScheduleSlot,
} from "@/features/classes/class-management.types";
export interface ClassEntity {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  type: ClassType;
  capacity: number | null;
  status: ClassLifecycle;
  progress: number;
  revision: number;
}
export interface ClassSubject {
  id: string;
  organizationId: string;
  classId: string;
  subjectId: string;
}
export interface ClassGradeScope {
  id: string;
  organizationId: string;
  classId: string;
  gradeId: string;
}
export interface ClassTeacherAssignment {
  id: string;
  organizationId: string;
  classId: string;
  teacherId: string;
}
export interface ClassScheduleRecord extends WeeklyScheduleSlot {
  id: string;
  organizationId: string;
  classId: string;
}
export interface ClassEnrollment {
  id: string;
  organizationId: string;
  classId: string;
  studentId: string;
  status: "active" | "withdrawn";
  startedAt: string;
  endedAt?: string;
}
const initialClasses: ClassEntity[] = [
  {
    id: "cls-1",
    organizationId: ORG,
    name: "國中數學 A班",
    code: "MATH-J-001",
    type: "progress",
    capacity: 32,
    status: "active",
    progress: 65,
    revision: 1,
  },
  {
    id: "cls-2",
    organizationId: ORG,
    name: "國中英文 B班",
    code: "ENG-J-002",
    type: "progress",
    capacity: 28,
    status: "active",
    progress: 42,
    revision: 1,
  },
  {
    id: "cls-3",
    organizationId: ORG,
    name: "高中物理進階班",
    code: "PHY-S-001",
    type: "individual",
    capacity: 18,
    status: "recruiting",
    progress: 28,
    revision: 1,
  },
];
const subjectMap: Record<string, string[]> = {
    "cls-1": ["math"],
    "cls-2": ["english"],
    "cls-3": ["physics"],
  },
  gradeMap: Record<string, string[]> = { "cls-1": ["j1", "j2"], "cls-2": ["j2"], "cls-3": ["s1"] },
  teacherMap: Record<string, string> = {
    "cls-1": "teacher",
    "cls-2": "admin",
    "cls-3": "assistant",
  };
const slotMap: Record<string, WeeklyScheduleSlot[]> = {
  "cls-1": [
    { weekday: 1, startTime: "18:30", endTime: "20:30", room: "201 教室" },
    { weekday: 4, startTime: "18:30", endTime: "20:30", room: "201 教室" },
  ],
  "cls-2": [
    { weekday: 2, startTime: "18:30", endTime: "20:30", room: "202 教室" },
    { weekday: 5, startTime: "18:30", endTime: "20:30", room: "202 教室" },
  ],
  "cls-3": [{ weekday: 6, startTime: "09:00", endTime: "12:00", room: "理化教室" }],
};
const makeRelations = () => ({
  subjects: Object.entries(subjectMap).flatMap(([classId, ids]) =>
    ids.map((subjectId, i) => ({
      id: `cs-${classId}-${i}`,
      organizationId: ORG,
      classId,
      subjectId,
    })),
  ),
  grades: Object.entries(gradeMap).flatMap(([classId, ids]) =>
    ids.map((gradeId, i) => ({ id: `cg-${classId}-${i}`, organizationId: ORG, classId, gradeId })),
  ),
  teachers: Object.entries(teacherMap).map(([classId, teacherId]) => ({
    id: `ct-${classId}`,
    organizationId: ORG,
    classId,
    teacherId,
  })),
  schedules: Object.entries(slotMap).flatMap(([classId, slots]) =>
    slots.map((slot, i) => ({ id: `slot-${classId}-${i}`, organizationId: ORG, classId, ...slot })),
  ),
  enrollments: initialEnrollmentFixtures.map((x) => ({
    ...x,
    startedAt: "2026-08-01",
  })) as ClassEnrollment[],
});
let classes = structuredClone(initialClasses),
  relations = makeRelations();
let sequence = 10;
export const classManagementStore = {
  get classes() {
    return classes;
  },
  get subjects() {
    return relations.subjects;
  },
  get grades() {
    return relations.grades;
  },
  get teachers() {
    return relations.teachers;
  },
  get schedules() {
    return relations.schedules;
  },
  get enrollments() {
    return relations.enrollments;
  },
  reset() {
    classes = structuredClone(initialClasses);
    relations = makeRelations();
    sequence = 10;
  },
  snapshot() {
    return structuredClone({ classes, relations });
  },
  replaceClass(
    record: ClassEntity,
    subjectIds: string[],
    gradeIds: string[],
    teacherId: string,
    schedules: WeeklyScheduleSlot[],
    studentIds: string[],
  ) {
    const before = this.snapshot();
    try {
      classes = classes.some((x) => x.id === record.id)
        ? classes.map((x) => (x.id === record.id ? record : x))
        : [...classes, record];
      relations.subjects = [
        ...relations.subjects.filter((x) => x.classId !== record.id),
        ...subjectIds.map((subjectId, i) => ({
          id: `cs-${record.id}-${i}`,
          organizationId: record.organizationId,
          classId: record.id,
          subjectId,
        })),
      ];
      relations.grades = [
        ...relations.grades.filter((x) => x.classId !== record.id),
        ...gradeIds.map((gradeId, i) => ({
          id: `cg-${record.id}-${i}`,
          organizationId: record.organizationId,
          classId: record.id,
          gradeId,
        })),
      ];
      relations.teachers = [
        ...relations.teachers.filter((x) => x.classId !== record.id),
        {
          id: `ct-${record.id}`,
          organizationId: record.organizationId,
          classId: record.id,
          teacherId,
        },
      ];
      relations.schedules = [
        ...relations.schedules.filter((x) => x.classId !== record.id),
        ...schedules.map((slot, i) => ({
          id: `slot-${record.id}-${i}`,
          organizationId: record.organizationId,
          classId: record.id,
          ...slot,
        })),
      ];
      const current = relations.enrollments.filter((x) => x.classId === record.id);
      const now = "2026-08-28";
      relations.enrollments = [
        ...relations.enrollments.filter((x) => x.classId !== record.id),
        ...current.map((x) =>
          studentIds.includes(x.studentId)
            ? { ...x, status: "active" as const, endedAt: undefined }
            : { ...x, status: "withdrawn" as const, endedAt: now },
        ),
        ...studentIds
          .filter((id) => !current.some((x) => x.studentId === id))
          .map((studentId) => ({
            id: `enrollment-${sequence++}`,
            organizationId: record.organizationId,
            classId: record.id,
            studentId,
            status: "active" as const,
            startedAt: now,
          })),
      ];
    } catch (error) {
      classes = before.classes;
      relations = before.relations;
      throw error;
    }
  },
  setStudentEnrollments(organizationId: string, studentId: string, classIds: string[]) {
    const selectedIds = new Set(classIds);
    const now = "2026-08-31";
    const current = relations.enrollments.filter(
      (enrollment) =>
        enrollment.organizationId === organizationId && enrollment.studentId === studentId,
    );
    relations.enrollments = [
      ...relations.enrollments.filter(
        (enrollment) =>
          enrollment.organizationId !== organizationId || enrollment.studentId !== studentId,
      ),
      ...current.map((enrollment) =>
        selectedIds.has(enrollment.classId)
          ? { ...enrollment, status: "active" as const, endedAt: undefined }
          : { ...enrollment, status: "withdrawn" as const, endedAt: now },
      ),
      ...classIds
        .filter((classId) => !current.some((enrollment) => enrollment.classId === classId))
        .map((classId) => ({
          id: `enrollment-${sequence++}`,
          organizationId,
          classId,
          studentId,
          status: "active" as const,
          startedAt: now,
        })),
    ];
  },
  nextId() {
    return `cls-${sequence++}`;
  },
};
export const classReferenceData = {
  subjects: [
    { id: "math", label: "數學" },
    { id: "english", label: "英文" },
    { id: "physics", label: "理化" },
    { id: "biology", label: "生物" },
  ],
  grades: [
    { id: "j1", label: "國一" },
    { id: "j2", label: "國二" },
    { id: "j3", label: "國三" },
    { id: "s1", label: "高一" },
    { id: "s2", label: "高二" },
    { id: "s3", label: "高三" },
  ],
  teachers: accessProfiles
    .filter((x) => ["teacher", "admin", "assistant"].includes(x.id))
    .map((x) => ({ id: x.id, label: x.name })),
  get students() {
    return students
      .filter((x) => x.status !== "archived")
      .map((x) => ({ id: x.id, label: x.name, number: x.number }));
  },
};
