import "server-only";
import { cookies } from "next/headers";
import type {
  AuthenticatedActor,
  AuthorizationContext,
} from "@/features/access-control/access-control.types";
import { resolveAuthenticatedSessionIdentity } from "./identity-core";
import { getAuthProviders } from "./providers";
export { resolveMockIdentity } from "./identity-core";
export const SESSION_COOKIE = "learntrack-session";
export async function getAuthenticatedActor(): Promise<AuthenticatedActor> {
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
  const providers = getAuthProviders();
  const actor = await resolveAuthenticatedSessionIdentity(sessionId, providers);
  if (!actor) throw new Error("UNAUTHORIZED");
  return actor;
}

export async function getAuthorizationContext(): Promise<AuthorizationContext> {
  const actor = await getAuthenticatedActor();
  if (actor.actorType !== "organization") throw new Error("ORGANIZATION_CONTEXT_REQUIRED");
  return actor;
}
