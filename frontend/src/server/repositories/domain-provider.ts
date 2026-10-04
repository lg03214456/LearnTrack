import "server-only";

import { authRuntimeConfig, type DomainDataProviderKind } from "@/server/auth/provider-config";

export interface DomainRepositoryProvider<TMock, TSupabase> {
  mock: TMock;
  supabase: TSupabase;
}

export function selectDomainRepository<TMock, TSupabase>(
  providers: DomainRepositoryProvider<TMock, TSupabase>,
  providerKind: DomainDataProviderKind = authRuntimeConfig().domainDataProvider,
): TMock | TSupabase {
  return providers[providerKind];
}
