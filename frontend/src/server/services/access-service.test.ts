import { beforeEach, describe, expect, it } from "vitest";
import { accessStore } from "@/server/data/mock/access";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { updateAccount, updateRolePermissions } from "./access-service";
describe("access service", () => {
  beforeEach(() => accessStore.reset());
  it("prevents the last owner lockout", () =>
    expect(
      updateAccount(resolveMockIdentity("owner"), { membershipId: "m-owner", status: "inactive" })
        .code,
    ).toBe("CONFLICT"));
  it("rejects teacher administration", () =>
    expect(
      updateAccount(resolveMockIdentity("teacher"), {
        membershipId: "m-assistant",
        status: "inactive",
      }).code,
    ).toBe("FORBIDDEN"));
  it("adds read dependencies and versions role updates", () => {
    const actor = resolveMockIdentity("owner"),
      role = accessStore.roles.find((x) => x.id === "assistant-role")!;
    expect(
      updateRolePermissions(actor, {
        roleId: role.id,
        version: role.version,
        permissions: ["accounts.manage"],
      }).ok,
    ).toBe(true);
    const changed = accessStore.roles.find((x) => x.id === role.id)!;
    expect(changed.permissions).toContain("accounts.read");
    expect(
      updateRolePermissions(actor, { roleId: role.id, version: role.version, permissions: [] })
        .code,
    ).toBe("CONFLICT");
  });
});
