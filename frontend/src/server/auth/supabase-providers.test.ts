import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineAuthProviderContract } from "../../../test/auth-provider-contract";

const fake = vi.hoisted(() => {
  const initial = {
    id: "supabase-user-owner",
    email: "owner@example.test",
    password: "Supabase-Owner-Password-2026!",
  };
  let user = { ...initial };
  let sent = 0;
  let tokenSequence = 0;
  const tokens = new Map<string, string>();

  const reset = () => {
    user = { ...initial };
    sent = 0;
    tokenSequence = 0;
    tokens.clear();
  };

  const publicClient = {
    auth: {
      signInWithPassword: vi.fn(
        async ({ email, password }: { email: string; password: string }) => {
          if (email !== user.email || password !== user.password)
            return { data: { user: null, session: null }, error: { message: "invalid" } };
          const accessToken = `access-token-${++tokenSequence}`;
          tokens.set(accessToken, user.id);
          return {
            data: {
              user: { id: user.id, email: user.email },
              session: {
                access_token: accessToken,
                expires_at: Math.floor(Date.now() / 1000) + 3600,
              },
            },
            error: null,
          };
        },
      ),
      resetPasswordForEmail: vi.fn(async () => {
        sent += 1;
        return { data: {}, error: null };
      }),
    },
  };

  const adminClient = {
    auth: {
      getUser: vi.fn(async (token: string) => {
        const authUserId = tokens.get(token);
        return authUserId
          ? { data: { user: { id: user.id, email: user.email } }, error: null }
          : { data: { user: null }, error: { message: "revoked" } };
      }),
      admin: {
        listUsers: vi.fn(async () => ({
          data: { users: [{ id: user.id, email: user.email }] },
          error: null,
        })),
        updateUserById: vi.fn(
          async (_authUserId: string, update: { email?: string; password?: string }) => {
            user = { ...user, ...update };
            return { data: { user: { id: user.id, email: user.email } }, error: null };
          },
        ),
        deleteUser: vi.fn(async () => ({ data: {}, error: null })),
        getUserById: vi.fn(async () => ({
          data: { user: { id: user.id, email: user.email } },
          error: null,
        })),
        signOut: vi.fn(async (token: string, scope: "local" | "global") => {
          if (scope === "global") {
            for (const [candidate, authUserId] of tokens)
              if (authUserId === user.id) tokens.delete(candidate);
          } else {
            tokens.delete(token);
          }
          return { data: {}, error: null };
        }),
      },
    },
  };

  return {
    initial,
    publicClient,
    adminClient,
    reset,
    sent: () => sent,
  };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn((_url: string, key: string) =>
    key.startsWith("sb_secret_") ? fake.adminClient : fake.publicClient,
  ),
}));

import {
  supabaseAuthProvider,
  supabaseEmailProvider,
  supabaseSessionProvider,
} from "./supabase-providers";

defineAuthProviderContract("Supabase", () => ({
  auth: supabaseAuthProvider,
  email: supabaseEmailProvider,
  sessions: supabaseSessionProvider,
  credential: {
    authUserId: fake.initial.id,
    email: fake.initial.email,
    password: fake.initial.password,
  },
  reset: () => {
    fake.reset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    process.env.AUTH_SITE_URL = "http://localhost:3000";
  },
  sentPasswordLinkCount: fake.sent,
}));

describe("Supabase password email", () => {
  beforeEach(() => fake.reset());

  it("uses the configured site URL and never forwards an application token", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.AUTH_SITE_URL = "https://learntrack.example.test";

    await supabaseEmailProvider.sendPasswordLink({
      recipient: fake.initial.email,
      link: {
        token: "must-not-leak",
        authUserId: fake.initial.id,
        purpose: "recovery",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      callbackUrl: "https://attacker.example/password/reset?token=must-not-leak",
    });

    expect(fake.publicClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(fake.initial.email, {
      redirectTo: "https://learntrack.example.test/password/reset",
    });
  });
});
