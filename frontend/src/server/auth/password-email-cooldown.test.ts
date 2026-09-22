import { beforeEach, describe, expect, it } from "vitest";
import {
  PASSWORD_EMAIL_COOLDOWN_SECONDS,
  resetPasswordEmailCooldownsForTest,
  startPasswordEmailCooldown,
} from "./password-email-cooldown";

describe("password email cooldown", () => {
  beforeEach(resetPasswordEmailCooldownsForTest);

  it("limits the same normalized email for one minute", () => {
    expect(startPasswordEmailCooldown("Owner@Example.test", 1_000)).toEqual({
      allowed: true,
      retryAfterSeconds: PASSWORD_EMAIL_COOLDOWN_SECONDS,
    });
    expect(startPasswordEmailCooldown("owner@example.test", 1_500)).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(startPasswordEmailCooldown("owner@example.test", 61_000)).toEqual({
      allowed: true,
      retryAfterSeconds: PASSWORD_EMAIL_COOLDOWN_SECONDS,
    });
  });
});
