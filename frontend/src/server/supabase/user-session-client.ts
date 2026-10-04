import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/supabase/public-config";

const userSessionClientOptions = (accessToken: string) => ({
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: { Authorization: `Bearer ${accessToken}` },
  },
});

export function createUserSessionSupabaseClient(accessToken: string): SupabaseClient {
  const normalizedToken = accessToken.trim();
  if (!normalizedToken) throw new Error("SUPABASE_SESSION_REQUIRED");
  const { url, publishableKey } = getSupabasePublicConfig();
  return createClient(url, publishableKey, userSessionClientOptions(normalizedToken));
}

export async function createCurrentUserSupabaseClient(): Promise<SupabaseClient> {
  const accessToken = (await cookies()).get("learntrack-session")?.value;
  if (!accessToken) throw new Error("SUPABASE_SESSION_REQUIRED");
  return createUserSessionSupabaseClient(accessToken);
}
