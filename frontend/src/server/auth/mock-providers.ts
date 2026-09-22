import "server-only";

import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import { accessStore } from "@/server/data/mock/access";
import { resolveMockIdentity } from "./identity-core";
import type {
  AuthIdentity,
  AuthProvider,
  AuthProviderResult,
  AuthSession,
  EmailProvider,
  MembershipRepository,
  PasswordLink,
  PasswordLinkProvider,
  SessionProvider,
} from "./contracts";

interface MockCredential extends AuthIdentity {
  password: string;
  enabled: boolean;
}

interface MockEmailMessage {
  recipient: string;
  link: PasswordLink;
  callbackUrl: string;
}

const seededCredentials: MockCredential[] = [
  {
    authUserId: "mock-auth-owner",
    email: "owner@learntrack.test",
    password: "Demo-Owner-2026!",
    enabled: true,
  },
  {
    authUserId: "mock-auth-director",
    email: "director@learntrack.test",
    password: "Demo-Director-2026!",
    enabled: true,
  },
  {
    authUserId: "mock-auth-teacher",
    email: "teacher@learntrack.test",
    password: "Demo-Teacher-2026!",
    enabled: true,
  },
  {
    authUserId: "mock-auth-inactive",
    email: "inactive@learntrack.test",
    password: "Demo-Inactive-2026!",
    enabled: false,
  },
];

const cloneCredentials = () => seededCredentials.map((credential) => ({ ...credential }));

export const mockAuthStore = {
  credentials: cloneCredentials(),
  sessions: [] as AuthSession[],
  emails: [] as MockEmailMessage[],
  passwordLinks: [] as PasswordLink[],
  reset() {
    this.credentials = cloneCredentials();
    this.sessions = [];
    this.emails = [];
    this.passwordLinks = [];
  },
};

const identity = (credential: MockCredential): AuthIdentity => ({
  authUserId: credential.authUserId,
  email: credential.email,
});

const conflict = <T>(): AuthProviderResult<T> => ({ ok: false, code: "CONFLICT" });

export const mockAuthProvider: AuthProvider = {
  async authenticate(email, password) {
    const credential = mockAuthStore.credentials.find(
      (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!credential || credential.password !== password)
      return { ok: false, code: "INVALID_CREDENTIALS" };
    if (!credential.enabled) return { ok: false, code: "ACCOUNT_DISABLED" };
    return { ok: true, value: identity(credential) };
  },
  async findIdentityByEmail(email) {
    const credential = mockAuthStore.credentials.find(
      (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
    );
    return credential ? identity(credential) : null;
  },
  async createIdentity(input) {
    if (
      mockAuthStore.credentials.some(
        (candidate) => candidate.email.toLowerCase() === input.email.trim().toLowerCase(),
      )
    )
      return conflict();
    const credential: MockCredential = {
      authUserId: `mock-auth-${crypto.randomUUID()}`,
      email: input.email.trim().toLowerCase(),
      password: input.initialPassword,
      enabled: input.enabled,
    };
    mockAuthStore.credentials.push(credential);
    return { ok: true, value: identity(credential) };
  },
  async changeEmail(authUserId, email) {
    const credential = mockAuthStore.credentials.find(
      (candidate) => candidate.authUserId === authUserId,
    );
    if (!credential) return { ok: false, code: "PROVIDER_UNAVAILABLE" };
    if (
      mockAuthStore.credentials.some(
        (candidate) =>
          candidate.authUserId !== authUserId &&
          candidate.email.toLowerCase() === email.trim().toLowerCase(),
      )
    )
      return conflict();
    credential.email = email.trim().toLowerCase();
    return { ok: true, value: identity(credential) };
  },
  async replacePassword(authUserId, password) {
    const credential = mockAuthStore.credentials.find(
      (candidate) => candidate.authUserId === authUserId,
    );
    if (!credential) return { ok: false, code: "PROVIDER_UNAVAILABLE" };
    credential.password = password;
    return { ok: true, value: true };
  },
  async setEnabled(authUserId, enabled) {
    const credential = mockAuthStore.credentials.find(
      (candidate) => candidate.authUserId === authUserId,
    );
    if (!credential) return { ok: false, code: "PROVIDER_UNAVAILABLE" };
    credential.enabled = enabled;
    return { ok: true, value: true };
  },
  async removeIdentity(authUserId) {
    mockAuthStore.credentials = mockAuthStore.credentials.filter(
      (candidate) => candidate.authUserId !== authUserId,
    );
  },
};

export const mockEmailProvider: EmailProvider = {
  async sendPasswordLink(message) {
    mockAuthStore.emails.push({ ...message, link: { ...message.link } });
    return { ok: true };
  },
};

export const mockPasswordLinkProvider: PasswordLinkProvider = {
  async create(authUserId, purpose) {
    const link: PasswordLink = {
      token: crypto.randomUUID(),
      authUserId,
      purpose,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
    mockAuthStore.passwordLinks.push(link);
    return { ...link };
  },
  async find(token) {
    const link = mockAuthStore.passwordLinks.find((candidate) => candidate.token === token);
    if (!link || link.consumedAt || Date.parse(link.expiresAt) <= Date.now()) return null;
    return { ...link };
  },
  async consume(token) {
    const link = mockAuthStore.passwordLinks.find((candidate) => candidate.token === token);
    if (!link || link.consumedAt || Date.parse(link.expiresAt) <= Date.now()) return false;
    link.consumedAt = new Date().toISOString();
    return true;
  },
};

export const mockSessionProvider: SessionProvider = {
  async create(authUserId) {
    const now = Date.now();
    const session: AuthSession = {
      id: crypto.randomUUID(),
      authUserId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 8 * 60 * 60 * 1000).toISOString(),
    };
    mockAuthStore.sessions.push(session);
    return { ...session };
  },
  async find(sessionId) {
    const session = mockAuthStore.sessions.find((candidate) => candidate.id === sessionId);
    if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) return null;
    return { ...session };
  },
  async revoke(sessionId) {
    const session = mockAuthStore.sessions.find((candidate) => candidate.id === sessionId);
    if (session && !session.revokedAt) session.revokedAt = new Date().toISOString();
  },
  async revokeAll(authUserId, exceptSessionId) {
    const revokedAt = new Date().toISOString();
    mockAuthStore.sessions.forEach((session) => {
      if (session.authUserId === authUserId && session.id !== exceptSessionId && !session.revokedAt)
        session.revokedAt = revokedAt;
    });
  },
};

export const mockMembershipRepository: MembershipRepository = {
  async resolveByAuthUserId(authUserId): Promise<AuthorizationContext | null> {
    const profile = accessStore.profiles.find((candidate) => candidate.authUserId === authUserId);
    if (!profile) return null;
    try {
      return resolveMockIdentity(profile.id);
    } catch {
      return null;
    }
  },
  async findAuthUserId(profileId) {
    return accessStore.profiles.find((candidate) => candidate.id === profileId)?.authUserId ?? null;
  },
  async linkAuthUser(profileId, authUserId) {
    const profile = accessStore.profiles.find((candidate) => candidate.id === profileId);
    if (!profile) return false;
    accessStore.updateProfile({ ...profile, authUserId });
    return true;
  },
};
