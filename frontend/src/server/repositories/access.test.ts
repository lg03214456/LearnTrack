import { beforeEach, describe, expect, it } from "vitest";
import { accessStore } from "@/server/data/mock/access";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { listAccounts, listRoles } from "./access";
describe("access repository", () => {
  beforeEach(() => accessStore.reset());
  it("filters accounts and derives summaries", () => {
    const result = listAccounts(resolveMockIdentity("owner"), {
      search: "teacher",
      status: "active",
      page: 1,
      pageSize: 20,
    });
    expect(result.rows.map((x) => x.email)).toEqual(["teacher@learntrack.test"]);
    expect(result.summary.total).toBe(9);
  });
  it("marks protected roles and member counts", () => {
    const roles = listRoles(resolveMockIdentity("owner"));
    expect(roles.find((x) => x.id === "owner-role")?.isSystem).toBe(true);
    expect(roles.find((x) => x.id === "teacher-role")?.memberCount).toBe(2);
  });
});
