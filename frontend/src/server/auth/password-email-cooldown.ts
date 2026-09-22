import "server-only";

import { createHash } from "node:crypto";

export const PASSWORD_EMAIL_COOLDOWN_SECONDS = 60;
const cooldownMs = PASSWORD_EMAIL_COOLDOWN_SECONDS * 1000;
const lastRequestAt = new Map<string, number>();

function emailKey(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export function startPasswordEmailCooldown(email: string, now = Date.now()) {
  const key = emailKey(email);
  const previous = lastRequestAt.get(key);
  const remainingMs = previous ? cooldownMs - (now - previous) : 0;
  if (remainingMs > 0) return { allowed: false, retryAfterSeconds: Math.ceil(remainingMs / 1000) };

  lastRequestAt.set(key, now);
  return { allowed: true, retryAfterSeconds: PASSWORD_EMAIL_COOLDOWN_SECONDS };
}

export function resetPasswordEmailCooldownsForTest() {
  lastRequestAt.clear();
}
