import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/public-config";
import { parsePasswordResetPath } from "./provider-config";
import type {
  AuthIdentity,
  AuthProvider,
  AuthProviderResult,
  AuthSession,
  EmailProvider,
  MembershipRepository,
  SessionProvider,
} from "./contracts";
import {
  permissionCodes,
  type AuthorizationContext,
  type PermissionCode,
} from "@/features/access-control/access-control.types";
import { buildPlatformActor } from "./identity-core";

const clientOptions = {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
} as const;

function adminClient(): SupabaseClient {
  const { url } = getSupabasePublicConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("AUTH_CONFIGURATION_INVALID");
  return createClient(url, secretKey, clientOptions);
}

function passwordClient(): SupabaseClient {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createClient(url, publishableKey, clientOptions);
}

function passwordResetRedirect(callbackUrl: string): string {
  const configuredSiteUrl = process.env.AUTH_SITE_URL?.trim();
  const baseUrl = configuredSiteUrl || new URL(callbackUrl).origin;
  return new URL(parsePasswordResetPath(process.env.AUTH_PASSWORD_RESET_PATH), baseUrl).toString();
}

export const supabaseEmailProvider: EmailProvider = {
  async sendPasswordLink({ recipient, callbackUrl }) {
    try {
      const { error } = await passwordClient().auth.resetPasswordForEmail(recipient.trim(), {
        redirectTo: passwordResetRedirect(callbackUrl),
      });
      if (error)
        console.error("Supabase password-email dispatch failed", {
          code: error.code,
          message: error.message,
        });
      return { ok: !error };
    } catch (error) {
      console.error("Supabase password-email dispatch failed", {
        message: error instanceof Error ? error.message : "unknown error",
      });
      return { ok: false };
    }
  },
};

const identity = (user: User): AuthIdentity => ({
  authUserId: user.id,
  email: user.email ?? "",
});

const providerUnavailable = <T>(): AuthProviderResult<T> => ({
  ok: false,
  code: "PROVIDER_UNAVAILABLE",
});

async function findUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const client = adminClient();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (match) return match;
    if (data.users.length < 100) return null;
  }
  return null;
}

const knownTokens = new Map<string, Set<string>>();

function rememberToken(authUserId: string, token: string) {
  const tokens = knownTokens.get(authUserId) ?? new Set<string>();
  tokens.add(token);
  knownTokens.set(authUserId, tokens);
}

export const supabaseAuthProvider: AuthProvider = {
  async authenticate(email, password) {
    const { data, error } = await passwordClient().auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) return { ok: false, code: "INVALID_CREDENTIALS" };
    const session: AuthSession = {
      id: data.session.access_token,
      authUserId: data.user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(
        (data.session.expires_at ?? Math.floor(Date.now() / 1000) + 60 * 60) * 1000,
      ).toISOString(),
    };
    rememberToken(data.user.id, session.id);
    return { ok: true, value: { ...identity(data.user), session } };
  },
  async findIdentityByEmail(email) {
    try {
      const user = await findUserByEmail(email);
      return user ? identity(user) : null;
    } catch {
      return null;
    }
  },
  async createIdentity(input) {
    const { data, error } = await adminClient().auth.admin.createUser({
      email: input.email,
      password: input.initialPassword,
      email_confirm: false,
      ban_duration: input.enabled ? "none" : "876000h",
    });
    if (error || !data.user)
      return error?.status === 422 ? { ok: false, code: "CONFLICT" } : providerUnavailable();
    return { ok: true, value: identity(data.user) };
  },
  async changeEmail(authUserId, email) {
    const { data, error } = await adminClient().auth.admin.updateUserById(authUserId, { email });
    if (error || !data.user) return providerUnavailable();
    return { ok: true, value: identity(data.user) };
  },
  async replacePassword(authUserId, password) {
    const { error } = await adminClient().auth.admin.updateUserById(authUserId, { password });
    return error ? providerUnavailable() : { ok: true, value: true };
  },
  async setEnabled(authUserId, enabled) {
    const { error } = await adminClient().auth.admin.updateUserById(authUserId, {
      ban_duration: enabled ? "none" : "876000h",
    });
    return error ? providerUnavailable() : { ok: true, value: true };
  },
  async removeIdentity(authUserId) {
    const { error } = await adminClient().auth.admin.deleteUser(authUserId);
    if (error) throw error;
  },
};

export const supabaseSessionProvider: SessionProvider = {
  async create(authUserId, providerSession) {
    if (!providerSession || providerSession.authUserId !== authUserId)
      throw new Error("AUTH_SESSION_MISSING");
    return providerSession;
  },
  async find(accessToken) {
    const { data, error } = await adminClient().auth.getUser(accessToken);
    if (error || !data.user) return null;
    return {
      id: accessToken,
      authUserId: data.user.id,
      createdAt: data.user.last_sign_in_at ?? new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  },
  async revoke(accessToken) {
    await adminClient().auth.admin.signOut(accessToken, "local");
  },
  async revokeAll(authUserId, exceptSessionId) {
    const tokens = knownTokens.get(authUserId) ?? new Set<string>();
    await Promise.all(
      [...tokens]
        .filter((token) => token !== exceptSessionId)
        .map((token) => adminClient().auth.admin.signOut(token, "global")),
    );
    knownTokens.set(
      authUserId,
      new Set(exceptSessionId && tokens.has(exceptSessionId) ? [exceptSessionId] : []),
    );
  },
};

export const supabaseMembershipRepository: MembershipRepository = {
  async resolveByAuthUserId(authUserId) {
    const client = adminClient();
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id, display_name, login_email")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (profileError || !profile) return null;
    const { data: platformOperator, error: platformError } = await client
      .from("platform_operators")
      .select("role_code, status")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (platformError) return null;
    if (platformOperator) {
      if (platformOperator.status !== "active" || platformOperator.role_code !== "platform-owner")
        return null;
      const { data: platformAssignments, error: platformAssignmentsError } = await client
        .from("platform_role_permissions")
        .select("permission_code")
        .eq("role_code", platformOperator.role_code);
      if (platformAssignmentsError || !platformAssignments?.length) return null;
      return buildPlatformActor({
        profile: {
          id: profile.id,
          displayName: profile.display_name,
          email: profile.login_email ?? "",
        },
        operator: { roleCode: platformOperator.role_code, status: platformOperator.status },
        permissionCodes: platformAssignments.map((assignment) => assignment.permission_code),
      });
    }
    const { data: memberships, error: membershipError } = await client
      .from("organization_memberships")
      .select("id, organization_id")
      .eq("profile_id", profile.id)
      .eq("status", "active")
      .limit(2);
    if (membershipError || !memberships || memberships.length !== 1) return null;
    const membership = memberships[0];
    const { data: links, error: linkError } = await client
      .from("membership_roles")
      .select("role_id")
      .eq("organization_id", membership.organization_id)
      .eq("membership_id", membership.id);
    const roleIds = links?.map((link) => link.role_id) ?? [];
    if (linkError || roleIds.length === 0) return null;
    const [{ data: roles, error: roleError }, { data: assignments, error: assignmentError }] =
      await Promise.all([
        client
          .from("roles")
          .select("id, name")
          .eq("organization_id", membership.organization_id)
          .in("id", roleIds),
        client
          .from("role_permissions")
          .select("role_id, permission_code, scope_kind")
          .eq("organization_id", membership.organization_id)
          .in("role_id", roleIds),
      ]);
    if (roleError || assignmentError || !roles?.length || !assignments?.length) return null;
    // AuthorizationContext currently represents one scope. Refuse relationship-scoped
    // memberships until their class/student repositories are migrated from Mock data.
    if (assignments.some((assignment) => assignment.scope_kind !== "organization-wide"))
      return null;
    const validPermissions = new Set(permissionCodes);
    const permissions = [
      ...new Set(assignments.map((assignment) => assignment.permission_code)),
    ].filter((code): code is PermissionCode => validPermissions.has(code as PermissionCode));
    if (permissions.length === 0) return null;
    const primaryRole = roles[0];
    const actor: AuthorizationContext = {
      actorType: "organization",
      profileId: profile.id,
      membershipId: membership.id,
      organizationId: membership.organization_id,
      name: profile.display_name,
      email: profile.login_email ?? "",
      roleId: primaryRole.id,
      roleName: roles.map((role) => role.name).join("、"),
      status: "active",
      permissions,
      scope: { kind: "organization-wide" },
    };
    return actor;
  },
  async findAuthUserId(profileId) {
    const { data, error } = await adminClient()
      .from("profiles")
      .select("auth_user_id")
      .eq("id", profileId)
      .maybeSingle();
    return error || !data?.auth_user_id ? null : data.auth_user_id;
  },
  async linkAuthUser(profileId, authUserId) {
    const { error } = await adminClient()
      .from("profiles")
      .update({ auth_user_id: authUserId })
      .eq("id", profileId)
      .is("auth_user_id", null);
    return !error;
  },
};
