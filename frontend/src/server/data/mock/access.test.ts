import { beforeEach, describe, expect, it } from "vitest";
import { accessStore } from "./access";

describe("access account model", () => {
  beforeEach(() => accessStore.reset());

  it("keeps domain profile IDs and RBAC relationships stable", () => {
    const owner = accessStore.profiles.find((profile) => profile.id === "owner");
    const membership = accessStore.memberships.find((candidate) => candidate.profileId === "owner");

    expect(owner).toMatchObject({
      id: "owner",
      authUserId: "mock-auth-owner",
      email: "owner@learntrack.test",
      createdByProfileId: "owner",
    });
    expect(membership).toMatchObject({
      id: "m-owner",
      profileId: "owner",
      roleId: "owner-role",
      status: "active",
    });
  });

  it("restores authentication metadata on reset", () => {
    const owner = accessStore.profiles.find((profile) => profile.id === "owner");
    if (!owner) throw new Error("TEST_PROFILE_MISSING");

    accessStore.updateProfile({ ...owner, lastLoginAt: "2026-09-01T01:00:00.000Z" });
    accessStore.reset();

    expect(
      accessStore.profiles.find((profile) => profile.id === "owner")?.lastLoginAt,
    ).toBeUndefined();
  });
});
