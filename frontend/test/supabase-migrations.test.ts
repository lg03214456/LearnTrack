import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { permissionCodes } from "@/features/access-control/access-control.types";

const migrationsDirectory = resolve(import.meta.dirname, "../supabase/migrations");
const schemaMigration = readFileSync(
  resolve(migrationsDirectory, "202609160001_identity_membership_and_audit.sql"),
  "utf8",
);
const rlsMigration = readFileSync(
  resolve(migrationsDirectory, "202609160002_row_level_security.sql"),
  "utf8",
);
const ownerBootstrap = readFileSync(
  resolve(import.meta.dirname, "../supabase/bootstrap/initialize-first-owner.sql"),
  "utf8",
);

const protectedTables = [
  "organizations",
  "profiles",
  "organization_memberships",
  "roles",
  "permissions",
  "role_permissions",
  "membership_roles",
  "students",
  "course_classes",
  "class_enrollments",
  "class_assignments",
  "student_user_links",
  "student_contacts",
  "audit_logs",
] as const;

describe("Supabase identity and RLS migrations", () => {
  it("creates every authorization table and enables RLS on it", () => {
    for (const table of protectedTables) {
      expect(schemaMigration).toContain(`create table public.${table}`);
      expect(rlsMigration).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it("keeps the database permission catalog aligned with the application catalog", () => {
    for (const permission of permissionCodes) {
      expect(schemaMigration).toContain(`('${permission}',`);
    }
  });

  it("preserves stable text IDs while using UUIDs only for Auth-facing links", () => {
    expect(schemaMigration).toMatch(/create table public\.profiles \(\s+id text primary key,/);
    expect(schemaMigration).toMatch(/create table public\.students \(\s+id text primary key,/);
    expect(schemaMigration).toContain(
      "auth_user_id uuid unique references auth.users(id) on delete set null",
    );
  });

  it("supports multiple roles and limits each student to one active self-login", () => {
    expect(schemaMigration).toContain("primary key (membership_id, role_id)");
    expect(schemaMigration).toContain("student_user_links_one_active_per_student");
    expect(schemaMigration).toContain("student_user_links_one_active_per_auth_user");
    expect(schemaMigration).toContain("where status = 'active';");
  });

  it("models permission-specific relationship scope", () => {
    for (const scope of [
      "organization-wide",
      "assigned-classes",
      "self-student",
      "linked-students",
    ]) {
      expect(schemaMigration).toContain(`'${scope}'`);
      expect(rlsMigration).toContain(`rp.scope_kind = '${scope}'`);
    }
    expect(rlsMigration).toContain("private.can_access_student");
    expect(rlsMigration).toContain("private.can_access_class");
  });

  it("requires active student and link state only for student-self access", () => {
    expect(rlsMigration).toContain("sul.status = 'active'");
    expect(rlsMigration).toContain("s.status = 'active'");
    expect(rlsMigration).toContain("rp.scope_kind = 'organization-wide'");
  });

  it("keeps audit history append-only for browser roles", () => {
    expect(schemaMigration).toContain("audit_logs_reject_update_or_delete");
    expect(rlsMigration).toContain("create policy audit_logs_select_organization_auditor");
    expect(rlsMigration).not.toMatch(/grant\s+(insert|update|delete)[^;]*audit_logs/i);
  });

  it("does not grant table access to anonymous users", () => {
    expect(rlsMigration).toContain("from anon, authenticated;");
    expect(rlsMigration).not.toMatch(/grant\s+[^;]+\s+to anon/i);
  });

  it("provides a one-time first Owner bootstrap that links a verified Auth user", () => {
    expect(ownerBootstrap).toContain("from auth.users");
    expect(ownerBootstrap).toContain("email_confirmed_at is not null");
    expect(ownerBootstrap).toContain("Initial Owner bootstrap only supports an empty");
    expect(ownerBootstrap).toContain("insert into public.organization_memberships");
    expect(ownerBootstrap).toContain("insert into public.role_permissions");
    expect(ownerBootstrap).toContain("'organization-wide'");
    expect(ownerBootstrap).toContain("account.bootstrap_owner");
    expect(ownerBootstrap).toContain("does not create an Auth user or store a password");
    expect(ownerBootstrap).not.toMatch(/secret[_ -]?key|sb_secret/i);
  });
});
