import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ClassEditorView } from "../class-management.types";
import { ClassBasicFields } from "./class-basic-fields";

const createView: ClassEditorView = {
  mode: "create",
  initial: {
    name: "",
    code: "",
    type: "progress",
    subjectIds: [],
    gradeIds: [],
    allGrades: false,
    teacherId: "",
    capacity: null,
    status: "recruiting",
    schedules: [],
    studentIds: [],
  },
  teacherOptions: [],
  subjectOptions: [{ id: "math", label: "數學" }],
  gradeOptions: [{ id: "j1", label: "國一" }],
  studentOptions: [],
  capabilities: {
    canCreate: true,
    canEdit: true,
    canChangeTeacher: true,
    canChangeLifecycle: true,
  },
};

describe("class basic fields", () => {
  afterEach(cleanup);

  it("prevents manual class-code input during creation", () => {
    render(<ClassBasicFields view={createView} values={createView.initial} />);

    expect(screen.getByDisplayValue("儲存後自動產生")).toBeDisabled();
    expect(screen.getByDisplayValue("儲存後自動產生")).not.toHaveAttribute("name", "code");
  });

  it("shows an existing class code as read-only during editing", () => {
    const editView = {
      ...createView,
      mode: "edit" as const,
      initial: { ...createView.initial, classId: "class-a", revision: 1, code: "MAT-0001" },
    };
    render(<ClassBasicFields view={editView} values={editView.initial} />);

    expect(screen.getByDisplayValue("MAT-0001")).toHaveAttribute("readonly");
    expect(screen.getByDisplayValue("MAT-0001")).toHaveAttribute("name", "code");
  });
});
