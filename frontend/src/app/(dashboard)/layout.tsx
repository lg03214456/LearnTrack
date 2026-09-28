import { Shell } from "@/components/shell";
import { getAuthorizationContext } from "@/server/auth/identity";
import { authRuntimeConfig } from "@/server/auth/provider-config";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/server/auth/identity";
import { resolveOrganizationSummary } from "@/server/organizations/organization-context";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor) {
    const hadSession = Boolean((await cookies()).get(SESSION_COOKIE));
    redirect(hadSession ? "/login?reason=session-expired" : "/login");
  }
  const organization = await resolveOrganizationSummary(actor);
  if (!organization) redirect("/login?reason=organization-unavailable");
  return (
    <Shell
      actor={actor}
      organizationName={organization.name}
      isMockMode={authRuntimeConfig().isMockMode}
    >
      {children}
    </Shell>
  );
}
