export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

type PublicSupabaseEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

export function parseSupabasePublicConfig(env: PublicSupabaseEnvironment): SupabasePublicConfig {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) throw new Error("SUPABASE_PUBLIC_CONFIGURATION_INVALID");

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") throw new Error("SUPABASE_PUBLIC_CONFIGURATION_INVALID");
  } catch {
    throw new Error("SUPABASE_PUBLIC_CONFIGURATION_INVALID");
  }

  return { url, publishableKey };
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  return parseSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
