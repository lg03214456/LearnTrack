import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type { ClassDailyWorkspace } from "@/features/class-sessions/class-session.types";
import { can, canAccessClass } from "@/server/authorization/policy";
import { createCurrentUserSupabaseClient } from "@/server/supabase/user-session-client";
import { mapRepositoryError, RepositoryError } from "./repository-error";

/** The RPC returns a tenant-scoped projection, using the caller's JWT, never a secret key. */
export class SupabaseClassSessionRepository {
  constructor(
    private readonly clientFactory: () => Promise<SupabaseClient> = createCurrentUserSupabaseClient,
  ) {}

  async open(
    actor: AuthorizationContext,
    classId: string,
    date: string,
  ): Promise<ClassDailyWorkspace | undefined> {
    if (!can(actor, "progress.read") || !canAccessClass(actor, classId)) return;
    const client = await this.clientFactory();
    const parameters = {
      target_organization_id: actor.organizationId,
      target_class_id: classId,
      target_date: date,
    };
    let { data, error } = await client.rpc("open_class_daily_workspace_v2", parameters);
    // Compatibility is real-data-only. Missing attendance migration is visible and disables saves.
    if (error && ["PGRST202", "42883"].includes(error.code)) {
      ({ data, error } = await client.rpc("open_class_daily_workspace", parameters));
      if (data) data = { ...data, attendanceAvailable: false, canManageAttendance: false };
    }
    if (error) throw mapRepositoryError(error);
    if (data === null) return;
    if (
      !data?.session ||
      data.session.classId !== classId ||
      data.session.sessionDate !== date ||
      !Array.isArray(data.members) ||
      !Array.isArray(data.history)
    )
      throw new RepositoryError("PERSISTENCE_UNAVAILABLE");
    return {
      ...data,
      canManage: Boolean(data.canManage) && can(actor, "progress.manage"),
      attendanceAvailable: data.attendanceAvailable === true,
      canManageAttendance:
        Boolean(data.canManageAttendance) &&
        can(actor, "attendance.read") &&
        can(actor, "attendance.manage"),
    };
  }

  async mutate(
    actor: AuthorizationContext,
    operation: "save" | "append" | "complete" | "correct",
    command: Record<string, unknown>,
  ): Promise<void> {
    if (!can(actor, "progress.manage")) throw new RepositoryError("FORBIDDEN");
    const client = await this.clientFactory();
    const { error } = await client.rpc("mutate_class_daily_progress", {
      target_organization_id: actor.organizationId,
      operation,
      command,
    });
    if (error) {
      if (["22P02", "22003", "22007", "22008", "22023"].includes(error.code))
        throw new RepositoryError("INVALID_RELATIONSHIP", { cause: error });
      throw mapRepositoryError(error);
    }
  }
}

export const supabaseClassSessionRepository = new SupabaseClassSessionRepository();
