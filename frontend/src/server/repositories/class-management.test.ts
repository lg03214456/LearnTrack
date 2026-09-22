import { afterEach, describe, expect, it } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { classManagementStore } from "@/server/data/mock/class-management";
import { classManagementRepository } from "./class-management";
afterEach(() => classManagementStore.reset());
describe("class management repository", () => {
  it("scopes overview and keeps teacher class configuration read-only", async () => {
    const all = await classManagementRepository.list(resolveMockIdentity("owner"));
    const assigned = await classManagementRepository.list(resolveMockIdentity("teacher"));
    expect(all).toHaveLength(3);
    expect(all.find((row) => row.id === "cls-1")?.studentCount).toBe(3);
    expect(assigned.map((row) => row.id)).toEqual(["cls-1"]);
    expect(assigned[0].capabilities.canEdit).toBe(false);
  });
  it("builds editor options without persistence rows", async () => {
    const view = await classManagementRepository.editor(resolveMockIdentity("owner"), "cls-1");
    expect(view?.initial.subjectIds).toEqual(["math"]);
    expect(view?.studentOptions.filter((row) => row.selected)).toHaveLength(3);
  });
  it("resolves active scheduled enrollments", async () => {
    const rows = await classManagementRepository.expectedAttendance(
      resolveMockIdentity("owner"),
      "2026-08-31",
    );
    expect(rows.map((row) => row.classId)).toContain("cls-1");
    expect(rows[0].students.length).toBeGreaterThan(0);
  });
});
