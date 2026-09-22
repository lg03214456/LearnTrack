import { beforeEach, describe, expect, it } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import {
  mockAuthProvider,
  mockAuthStore,
  mockEmailProvider,
  mockPasswordLinkProvider,
  mockSessionProvider,
} from "@/server/auth/mock-providers";
import { accessStore } from "@/server/data/mock/access";
import {
  changeManagedAccountEmail,
  createOwnerManagedAccount,
  sendManagedPasswordLink,
  setManagedAccountStatus,
} from "./account-administration-service";

const providers = {
  auth: mockAuthProvider,
  email: mockEmailProvider,
  passwordLinks: mockPasswordLinkProvider,
  sessions: mockSessionProvider,
};
const validInput = {
  name: "新老師",
  email: "new-teacher@learntrack.test",
  initialPassword: "Demo-New-Teacher-2026!",
  roleId: "teacher-role",
  status: "active" as const,
  classIds: ["cls-1"],
};

describe("Owner account administration", () => {
  beforeEach(() => {
    accessStore.reset();
    mockAuthStore.reset();
  });

  it("creates a linked account with creator, role, scope, and status", async () => {
    expect(
      await createOwnerManagedAccount(resolveMockIdentity("owner"), validInput, providers),
    ).toMatchObject({ ok: true });
    const profile = accessStore.profiles.find((candidate) => candidate.email === validInput.email);
    expect(profile).toMatchObject({ createdByProfileId: "owner" });
    expect(
      accessStore.memberships.find((candidate) => candidate.profileId === profile?.id),
    ).toMatchObject({
      roleId: "teacher-role",
      status: "active",
      classIds: ["cls-1"],
    });
  });

  it.each([
    ["unauthorized", resolveMockIdentity("teacher"), validInput, "FORBIDDEN"],
    [
      "duplicate",
      resolveMockIdentity("owner"),
      { ...validInput, email: "teacher@learntrack.test" },
      "CONFLICT",
    ],
    [
      "invalid role",
      resolveMockIdentity("owner"),
      { ...validInput, roleId: "missing" },
      "NOT_FOUND",
    ],
    [
      "invalid scope",
      resolveMockIdentity("owner"),
      { ...validInput, classIds: ["cross-org-class"] },
      "VALIDATION_ERROR",
    ],
  ])("rejects %s account creation", async (_label, actor, input, code) => {
    await expect(createOwnerManagedAccount(actor, input, providers)).resolves.toMatchObject({
      ok: false,
      code,
    });
  });

  it("compensates a provider identity when activation fails", async () => {
    const failing = {
      ...providers,
      auth: {
        ...mockAuthProvider,
        setEnabled: async () => ({ ok: false as const, code: "PROVIDER_UNAVAILABLE" as const }),
      },
    };
    await expect(
      createOwnerManagedAccount(resolveMockIdentity("owner"), validInput, failing),
    ).resolves.toMatchObject({ ok: false });
    expect(accessStore.profiles.some((candidate) => candidate.email === validInput.email)).toBe(
      false,
    );
    expect(
      mockAuthStore.credentials.some((candidate) => candidate.email === validInput.email),
    ).toBe(false);
  });

  it("changes email, force-resets sessions, and never returns a password", async () => {
    const actor = resolveMockIdentity("owner");
    await expect(
      changeManagedAccountEmail(
        actor,
        { membershipId: "m-teacher", email: "changed@learntrack.test" },
        providers,
      ),
    ).resolves.toMatchObject({ ok: true });
    const session = await mockSessionProvider.create("mock-auth-teacher");
    const reset = await sendManagedPasswordLink(
      actor,
      { membershipId: "m-teacher", purpose: "recovery", callbackBaseUrl: "http://localhost:3000" },
      providers,
    );
    expect(reset).toMatchObject({ ok: true });
    expect(reset).not.toHaveProperty("password");
    expect(await mockSessionProvider.find(session.id)).toBeNull();
  });

  it("prevents last Owner disable and revokes sessions when disabling another account", async () => {
    const actor = resolveMockIdentity("owner");
    await expect(
      setManagedAccountStatus(actor, { membershipId: "m-owner", status: "inactive" }, providers),
    ).resolves.toMatchObject({ ok: false, code: "CONFLICT" });
    const session = await mockSessionProvider.create("mock-auth-teacher");
    await expect(
      setManagedAccountStatus(actor, { membershipId: "m-teacher", status: "inactive" }, providers),
    ).resolves.toMatchObject({ ok: true });
    expect(await mockSessionProvider.find(session.id)).toBeNull();
  });
});
