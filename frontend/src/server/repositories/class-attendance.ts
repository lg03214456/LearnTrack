import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type { SaveClassAttendanceCommand } from "@/features/class-sessions/class-session.types";
import { can } from "@/server/authorization/policy";
import { createCurrentUserSupabaseClient } from "@/server/supabase/user-session-client";
import { selectDomainRepository } from "./domain-provider";
import { mockClassAttendanceRepository } from "./class-attendance-mock";
import { RepositoryError, mapRepositoryError } from "./repository-error";

export class SupabaseClassAttendanceRepository {
  constructor(
    private readonly clientFactory: () => Promise<SupabaseClient> = createCurrentUserSupabaseClient,
  ) {}
  async save(actor: AuthorizationContext, command: SaveClassAttendanceCommand) {
    if (!can(actor, "attendance.manage") || !can(actor, "attendance.read"))
      throw new RepositoryError("FORBIDDEN");
    const client = await this.clientFactory();
    const { error } = await client.rpc("save_class_daily_attendance", {
      target_organization_id: actor.organizationId,
      command,
    });
    if (error) {
      if (["22P02", "22003", "22007", "22008", "22023"].includes(error.code))
        throw new RepositoryError("INVALID_RELATIONSHIP", { cause: error });
      throw mapRepositoryError(error);
    }
  }
}

const supabaseClassAttendanceRepository = new SupabaseClassAttendanceRepository();
export const classAttendanceRepository = {
  save(actor: AuthorizationContext, command: SaveClassAttendanceCommand) {
    return selectDomainRepository({
      mock: mockClassAttendanceRepository,
      supabase: supabaseClassAttendanceRepository,
    }).save(actor, command);
  },
};
