import "server-only";
import { cookies } from "next/headers";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import { resolveSessionIdentity } from "./identity-core";
import { getAuthProviders } from "./providers";
export { resolveMockIdentity } from "./identity-core";
export const SESSION_COOKIE = "learntrack-session";
export async function getAuthorizationContext(): Promise<AuthorizationContext> {
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
  const providers = getAuthProviders();
  const actor = await resolveSessionIdentity(sessionId, providers);
  if (!actor) throw new Error("UNAUTHORIZED");
  return actor;
}
