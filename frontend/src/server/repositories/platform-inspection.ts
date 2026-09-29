import "server-only";

import { createClient } from "@supabase/supabase-js";
import type {
  AuthenticatedActor,
  PlatformAuthorizationContext,
} from "@/features/access-control/access-control.types";
import type { PlatformOrganizationSnapshot } from "@/features/platform-inspection/platform-inspection.types";
import { getSupabasePublicConfig } from "@/lib/supabase/public-config";
import { canReadOrganizationData } from "@/server/authorization/policy";
import { authRuntimeConfig } from "@/server/auth/provider-config";

export interface PlatformInspectionRepository {
  readOrganization(
    actor: AuthenticatedActor,
    targetOrganizationId: string,
    accessToken: string,
  ): Promise<PlatformOrganizationSnapshot>;
}

function authenticatedClient(accessToken: string) {
  const { url, publishableKey } = getSupabasePublicConfig();
  if (!accessToken.trim()) throw new Error("UNAUTHORIZED");
  return createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export const supabasePlatformInspectionRepository: PlatformInspectionRepository = {
  async readOrganization(actor, targetOrganizationId, accessToken) {
    if (actor.actorType !== "platform" || !canReadOrganizationData(actor, targetOrganizationId))
      throw new Error("FORBIDDEN");
    if (authRuntimeConfig().authProvider !== "supabase")
      throw new Error("PLATFORM_INSPECTION_UNSUPPORTED");

    const client = authenticatedClient(accessToken);
    const [organizationResult, studentsResult, classesResult] = await Promise.all([
      client
        .from("organizations")
        .select("id, name, status")
        .eq("id", targetOrganizationId)
        .eq("status", "active")
        .maybeSingle(),
      client
        .from("students")
        .select("id, student_number, display_name, status")
        .eq("organization_id", targetOrganizationId)
        .order("display_name"),
      client
        .from("course_classes")
        .select("id, name, status")
        .eq("organization_id", targetOrganizationId)
        .order("name"),
    ]);

    if (organizationResult.error || !organizationResult.data)
      throw new Error("ORGANIZATION_NOT_FOUND");
    if (studentsResult.error || classesResult.error) throw new Error("PLATFORM_READ_FAILED");

    return {
      organization: {
        id: organizationResult.data.id,
        name: organizationResult.data.name,
        status: "active",
      },
      students: (studentsResult.data ?? []).map((student) => ({
        id: student.id,
        studentNumber: student.student_number,
        displayName: student.display_name,
        status: student.status,
      })),
      classes: (classesResult.data ?? []).map((courseClass) => ({
        id: courseClass.id,
        name: courseClass.name,
        status: courseClass.status,
      })),
    };
  },
};

export function requirePlatformActor(
  actor: AuthenticatedActor,
): asserts actor is PlatformAuthorizationContext {
  if (actor.actorType !== "platform") throw new Error("FORBIDDEN");
}
