import "server-only";

import type { StudentRecord } from "@/server/domain/types";
import { classManagementStore } from "@/server/data/mock/class-management";
import { students } from "@/server/data/mock/fixtures";
import { studentProfileStore } from "@/server/data/mock/student-profile";

export interface StudentClassCapacity {
  id: string;
  name: string;
  capacity: number | null;
}

export interface StudentRosterMutationRepository {
  nextStudentNumber(organizationId: string): string;
  findStudent(organizationId: string, studentId: string): StudentRecord | undefined;
  hasStudentNumber(organizationId: string, number: string, excludeStudentId?: string): boolean;
  listClasses(organizationId: string): StudentClassCapacity[];
  isActivelyEnrolled(classId: string, studentId?: string): boolean;
  countActiveEnrollments(classId: string): number;
  saveStudent(student: StudentRecord): void;
  setStudentEnrollments(organizationId: string, studentId: string, classIds: string[]): void;
  updateStudentProfile(organizationId: string, studentId: string, phone: string): void;
}

class MockStudentRosterMutationRepository implements StudentRosterMutationRepository {
  nextStudentNumber(organizationId: string) {
    const nextNumber =
      students
        .filter((student) => student.organizationId === organizationId)
        .map((student) => /^STU-(\d+)$/.exec(student.number)?.[1])
        .filter((number): number is string => Boolean(number))
        .reduce((maximum, number) => Math.max(maximum, Number(number)), 0) + 1;
    return `STU-${String(nextNumber).padStart(4, "0")}`;
  }

  findStudent(organizationId: string, studentId: string) {
    return students.find(
      (student) => student.id === studentId && student.organizationId === organizationId,
    );
  }

  hasStudentNumber(organizationId: string, number: string, excludeStudentId?: string) {
    return students.some(
      (student) =>
        student.organizationId === organizationId &&
        student.id !== excludeStudentId &&
        student.number.toLowerCase() === number.toLowerCase(),
    );
  }

  listClasses(organizationId: string) {
    return classManagementStore.classes
      .filter((courseClass) => courseClass.organizationId === organizationId)
      .map(({ id, name, capacity }) => ({ id, name, capacity }));
  }

  isActivelyEnrolled(classId: string, studentId?: string) {
    return classManagementStore.enrollments.some(
      (enrollment) =>
        enrollment.classId === classId &&
        enrollment.studentId === studentId &&
        enrollment.status === "active",
    );
  }

  countActiveEnrollments(classId: string) {
    return classManagementStore.enrollments.filter(
      (enrollment) => enrollment.classId === classId && enrollment.status === "active",
    ).length;
  }

  saveStudent(student: StudentRecord) {
    const existingIndex = students.findIndex(
      (candidate) =>
        candidate.id === student.id && candidate.organizationId === student.organizationId,
    );
    if (existingIndex >= 0) students.splice(existingIndex, 1, student);
    else students.push(student);
  }

  setStudentEnrollments(organizationId: string, studentId: string, classIds: string[]) {
    classManagementStore.setStudentEnrollments(organizationId, studentId, classIds);
  }

  updateStudentProfile(organizationId: string, studentId: string, phone: string) {
    const profile = studentProfileStore.profiles.find(
      (candidate) =>
        candidate.studentId === studentId && candidate.organizationId === organizationId,
    );
    if (profile) studentProfileStore.updateProfile({ ...profile, phone });
    else
      studentProfileStore.addProfile({
        studentId,
        organizationId,
        phone,
        school: "未設定",
        grade: "未設定",
        revision: 1,
      });
  }
}

export const studentRosterMutationRepository: StudentRosterMutationRepository =
  new MockStudentRosterMutationRepository();
