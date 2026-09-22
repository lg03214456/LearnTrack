import { Shell } from "@/components/shell";
import { getAuthorizationContext } from "@/server/auth/identity";
import { authRuntimeConfig } from "@/server/auth/provider-config";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/server/auth/identity";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor) {
    const hadSession = Boolean((await cookies()).get(SESSION_COOKIE));
    redirect(hadSession ? "/login?reason=session-expired" : "/login");
  }
  return (
    <Shell actor={actor} isMockMode={authRuntimeConfig().isMockMode}>
      {children}
    </Shell>
  );
}
