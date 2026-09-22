import "server-only";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type { AuditEventView } from "@/features/audit-log/audit-log.types";

export interface AuthIdentity {
  authUserId: string;
  email: string;
  session?: AuthSession;
}

export type AuthProviderResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: "INVALID_CREDENTIALS" | "ACCOUNT_DISABLED" | "CONFLICT" | "PROVIDER_UNAVAILABLE";
    };

export interface AuthProvider {
  authenticate(email: string, password: string): Promise<AuthProviderResult<AuthIdentity>>;
  findIdentityByEmail(email: string): Promise<AuthIdentity | null>;
  createIdentity(input: {
    email: string;
    initialPassword: string;
    enabled: boolean;
  }): Promise<AuthProviderResult<AuthIdentity>>;
  changeEmail(authUserId: string, email: string): Promise<AuthProviderResult<AuthIdentity>>;
  replacePassword(authUserId: string, password: string): Promise<AuthProviderResult<true>>;
  setEnabled(authUserId: string, enabled: boolean): Promise<AuthProviderResult<true>>;
  removeIdentity(authUserId: string): Promise<void>;
}

export interface PasswordLink {
  token: string;
  authUserId: string;
  purpose: "setup" | "change" | "recovery";
  expiresAt: string;
  consumedAt?: string;
}

export interface EmailProvider {
  sendPasswordLink(input: {
    recipient: string;
    link: PasswordLink;
    callbackUrl: string;
  }): Promise<{ ok: boolean }>;
}

export interface PasswordLinkProvider {
  create(authUserId: string, purpose: PasswordLink["purpose"]): Promise<PasswordLink>;
  find(token: string): Promise<PasswordLink | null>;
  consume(token: string): Promise<boolean>;
}

export interface AuthSession {
  id: string;
  authUserId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface SessionProvider {
  create(authUserId: string, providerSession?: AuthSession): Promise<AuthSession>;
  find(sessionId: string): Promise<AuthSession | null>;
  revoke(sessionId: string): Promise<void>;
  revokeAll(authUserId: string, exceptSessionId?: string): Promise<void>;
}

export interface MembershipRepository {
  resolveByAuthUserId(authUserId: string): Promise<AuthorizationContext | null>;
  findAuthUserId(profileId: string): Promise<string | null>;
  linkAuthUser(profileId: string, authUserId: string): Promise<boolean>;
}

export interface AuditEventInput extends Omit<AuditEventView, "id" | "createdAt"> {
  requestId?: string;
}

export interface AuditRepository {
  assertWritable(): Promise<void>;
  append(event: AuditEventInput): Promise<AuditEventView>;
  list(input: {
    organizationId: string;
    actorProfileId?: string;
    action?: string;
    resourceType?: string;
    result?: AuditEventView["result"];
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
  }): Promise<{ rows: AuditEventView[]; total: number }>;
}
