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
const platformMigration = readFileSync(
  resolve(migrationsDirectory, "202609290001_platform_owner_read_access.sql"),
  "utf8",
);
const studentClassMigration = readFileSync(
  resolve(migrationsDirectory, "202610020001_student_class_persistence.sql"),
  "utf8",
);
const studentClassFunctionsMigration = readFileSync(
  resolve(migrationsDirectory, "202610020002_student_class_functions.sql"),
  "utf8",
);
const studentClassContractAlignmentMigration = readFileSync(
  resolve(migrationsDirectory, "202610020003_student_class_contract_alignment.sql"),
  "utf8",
);
const studentDetailAssessmentMigration = readFileSync(
  resolve(migrationsDirectory, "202610020004_student_detail_assessments.sql"),
  "utf8",
);
const studentDetailFunctionsMigration = readFileSync(
  resolve(migrationsDirectory, "202610020005_student_detail_functions.sql"),
  "utf8",
);
const classSessionProgressMigration = readFileSync(
  resolve(migrationsDirectory, "202610030001_class_session_progress.sql"),
  "utf8",
);
const aggregateFunctionAmbiguityMigration = readFileSync(
  resolve(migrationsDirectory, "202610030002_fix_aggregate_function_ambiguity.sql"),
  "utf8",
);
const automaticStudentNumbersMigration = readFileSync(
  resolve(migrationsDirectory, "202610030003_automatic_student_numbers.sql"),
  "utf8",
);
const subjectCatalogAndClassCodesMigration = readFileSync(
  resolve(migrationsDirectory, "202610050001_subject_catalog_and_automatic_class_codes.sql"),
  "utf8",
);
const automaticClassCodeAmbiguityFixMigration = readFileSync(
  resolve(migrationsDirectory, "202610050002_fix_automatic_class_code_function_ambiguity.sql"),
  "utf8",
);
const ownerBootstrap = readFileSync(
  resolve(import.meta.dirname, "../supabase/bootstrap/initialize-first-owner.sql"),
  "utf8",
);
const platformOwnerBootstrap = readFileSync(
  resolve(import.meta.dirname, "../supabase/bootstrap/initialize-platform-owner.sql"),
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

  it("adds a separate append-only platform authorization model", () => {
    for (const table of [
      "platform_operators",
      "platform_permissions",
      "platform_role_permissions",
      "platform_audit_logs",
    ]) {
      expect(platformMigration).toContain(`create table public.${table}`);
      expect(platformMigration).toContain(`alter table public.${table} enable row level security;`);
    }
    expect(platformMigration).toContain("platform_audit_logs_reject_update_or_delete");
    expect(platformMigration).not.toMatch(/grant\s+(insert|update|delete)[^;]*platform_/i);
  });

  it("grants platform operators tenant reads without tenant writes or self-promotion", () => {
    expect(platformMigration).toContain("private.has_platform_permission");
    expect(platformMigration).toContain("platform.tenant_data.read");
    expect(platformMigration).toContain(
      "or private.has_platform_permission('platform.tenant_data.read')",
    );
    expect(platformMigration).not.toMatch(/grant\s+(insert|update|delete)[^;]*platform_operators/i);
    expect(platformMigration).not.toMatch(
      /create policy[\s\S]+platform_operators[\s\S]+for insert/i,
    );
  });

  it("bootstraps a verified platform owner without credentials or tenant membership", () => {
    expect(platformOwnerBootstrap).toContain("from public.profiles p");
    expect(platformOwnerBootstrap).toContain("join auth.users u");
    expect(platformOwnerBootstrap).toContain("u.email_confirmed_at is not null");
    expect(platformOwnerBootstrap).toContain(
      "must not also have an active organization membership",
    );
    expect(platformOwnerBootstrap).toContain("on conflict (profile_id) do update");
    expect(platformOwnerBootstrap).not.toMatch(/secret[_ -]?key|sb_secret|password\s*:=/i);
  });
});

describe("Supabase student and class persistence migration", () => {
  const newTables = [
    "student_profiles",
    "class_subjects",
    "class_grade_scopes",
    "class_schedules",
  ] as const;

  it("creates every new table with organization relationships and RLS", () => {
    for (const table of newTables) {
      expect(studentClassMigration).toContain(`create table if not exists public.${table}`);
      expect(studentClassMigration).toContain(
        `alter table public.${table} enable row level security;`,
      );
      expect(studentClassMigration).toContain(`public.${table}`);
    }
    expect(studentClassMigration).toContain("references public.students(id, organization_id)");
    expect(studentClassMigration).toContain(
      "references public.course_classes(id, organization_id)",
    );
  });

  it("adds conflict revisions, update timestamps, constraints, and query indexes", () => {
    for (const relation of [
      "students",
      "course_classes",
      "class_enrollments",
      "class_assignments",
    ]) {
      expect(studentClassMigration).toContain(`alter table public.${relation}`);
    }
    expect(studentClassMigration).toMatch(/revision integer not null default 1/g);
    expect(studentClassMigration).toContain("create or replace function public.set_updated_at()");
    expect(studentClassMigration).toContain("class_schedules_organization_class_status_idx");
    expect(studentClassMigration).toContain("check (starts_at < ends_at)");
    expect(studentClassMigration).toContain("course_classes_organization_code_idx");
    expect(studentClassMigration).toContain("'recruiting'");
  });

  it("grants authenticated access only behind relationship policies", () => {
    expect(studentClassMigration).toContain("from anon, authenticated;");
    expect(studentClassMigration).not.toMatch(/grant\s+[^;]+\s+to anon/i);
    expect(studentClassMigration).toContain("private.can_access_student");
    expect(studentClassMigration).toContain("private.can_access_class");
    for (const table of newTables) {
      expect(studentClassMigration).toMatch(new RegExp(`create policy ${table}`));
    }
  });
});

describe("Supabase student and class aggregate functions", () => {
  it("writes the complete class aggregate in one PostgreSQL transaction", () => {
    expect(studentClassFunctionsMigration).toContain(
      "create or replace function public.save_class_aggregate",
    );
    for (const table of [
      "course_classes",
      "class_subjects",
      "class_grade_scopes",
      "class_assignments",
      "class_schedules",
      "class_enrollments",
    ])
      expect(studentClassFunctionsMigration).toContain(`public.${table}`);
    expect(studentClassFunctionsMigration).toContain("REVISION_CONFLICT");
    expect(studentClassFunctionsMigration).toContain("INVALID_TEACHER");
    expect(studentClassFunctionsMigration).toContain("INVALID_STUDENT");
    expect(studentClassFunctionsMigration).toContain("CAPACITY_EXCEEDED");
  });

  it("writes students, profiles, enrollments, archive, and restore atomically", () => {
    expect(studentClassFunctionsMigration).toContain(
      "create or replace function public.save_student_aggregate",
    );
    expect(studentClassFunctionsMigration).toContain(
      "create or replace function public.change_student_lifecycle",
    );
    expect(studentClassFunctionsMigration).toContain("ARCHIVE_REASON_REQUIRED");
    expect(studentClassFunctionsMigration).toContain("STUDENT_NOT_ARCHIVED");
    expect(studentClassFunctionsMigration).toContain("on conflict (student_id) do update");
  });

  it("exposes aggregate functions only to authenticated actors", () => {
    expect(studentClassFunctionsMigration).toContain("from public;");
    expect(studentClassFunctionsMigration).toContain("to authenticated;");
    expect(studentClassFunctionsMigration).not.toMatch(/grant execute[^;]+to anon/i);
    expect(studentClassFunctionsMigration).toContain("private.has_organization_wide_permission");
  });
});

describe("Supabase student and class contract alignment", () => {
  it("keeps every application class type valid in PostgreSQL", () => {
    for (const classType of ["progress", "individual", "study"])
      expect(studentClassContractAlignmentMigration).toContain(`'${classType}'`);
    expect(studentClassContractAlignmentMigration).toContain(
      "drop constraint if exists course_classes_class_type_check",
    );
  });
});

describe("Supabase student detail and assessment persistence", () => {
  it("creates assessment tables with tenant-safe relationships and revisions", () => {
    for (const table of ["assessments", "assessment_results"]) {
      expect(studentDetailAssessmentMigration).toContain(
        `create table if not exists public.${table}`,
      );
      expect(studentDetailAssessmentMigration).toContain(
        `alter table public.${table} enable row level security;`,
      );
    }
    expect(studentDetailAssessmentMigration).toContain(
      "references public.assessments(id, organization_id)",
    );
    expect(studentDetailAssessmentMigration).toContain(
      "references public.students(id, organization_id)",
    );
    expect(studentDetailAssessmentMigration).toContain(
      "unique (organization_id, assessment_id, student_id)",
    );
    expect(studentDetailAssessmentMigration).toContain(
      "assessment_results_organization_student_idx",
    );
  });

  it("supports contacts without logins while retaining optional Auth profile links", () => {
    expect(studentDetailAssessmentMigration).toContain(
      "alter column contact_profile_id drop not null",
    );
    expect(studentDetailAssessmentMigration).toContain(
      "add column if not exists display_name text",
    );
    expect(studentDetailAssessmentMigration).toContain("student_contacts_identity_check");
    expect(studentDetailAssessmentMigration).toContain(
      "student_contacts_organization_student_status_idx",
    );
  });

  it("validates score bounds and protects reads and writes by relationship", () => {
    expect(studentDetailAssessmentMigration).toContain(
      "create or replace function private.validate_assessment_result_score()",
    );
    expect(studentDetailAssessmentMigration).toContain("SCORE_EXCEEDS_MAXIMUM");
    expect(studentDetailAssessmentMigration).toContain("private.can_access_student");
    expect(studentDetailAssessmentMigration).toContain("private.can_access_class");
    expect(studentDetailAssessmentMigration).toContain("assessment_history.manage");
    expect(studentDetailAssessmentMigration).not.toMatch(/grant\s+[^;]+\s+to anon/i);
  });

  it("provides atomic authenticated profile, contact, and result writes", () => {
    for (const routine of [
      "save_student_detail_profile",
      "record_assessment_result",
      "correct_assessment_result",
    ]) {
      expect(studentDetailFunctionsMigration).toContain(
        `create or replace function public.${routine}`,
      );
    }
    expect(studentDetailFunctionsMigration).toContain("REVISION_CONFLICT");
    expect(studentDetailFunctionsMigration).toContain("private.can_access_student");
    expect(studentDetailFunctionsMigration).toContain("to authenticated;");
    expect(studentDetailFunctionsMigration).not.toMatch(/grant execute[^;]+to anon/i);
  });
});

describe("Supabase class session and progress persistence", () => {
  const sessionTables = [
    "class_sessions",
    "class_session_members",
    "attendance_records",
    "student_session_progress",
  ] as const;

  it("creates tenant-scoped session tables with revisions and correction lineage", () => {
    for (const table of sessionTables) {
      expect(classSessionProgressMigration).toContain(`create table if not exists public.${table}`);
      expect(classSessionProgressMigration).toContain(
        `alter table public.${table} enable row level security;`,
      );
    }
    expect(classSessionProgressMigration).toContain("supersedes_id uuid unique");
    expect(classSessionProgressMigration).toContain("revision integer not null default 1");
    expect(classSessionProgressMigration).toContain(
      "unique (organization_id, class_id, session_date)",
    );
    expect(classSessionProgressMigration).toContain(
      "student_session_progress_student_recorded_idx",
    );
  });

  it("keeps reads and inserts behind class or student relationships", () => {
    expect(classSessionProgressMigration).toContain("private.can_access_class");
    expect(classSessionProgressMigration).toContain("private.can_access_student");
    expect(classSessionProgressMigration).toContain("'progress.read'");
    expect(classSessionProgressMigration).toContain("'progress.manage'");
    expect(classSessionProgressMigration).not.toMatch(/grant\s+[^;]+\s+to anon/i);
  });
});

describe("Supabase aggregate function ambiguity fix", () => {
  it("recompiles every affected aggregate function with table-column precedence", () => {
    for (const routine of [
      "save_class_aggregate",
      "save_student_aggregate",
      "change_student_lifecycle",
    ])
      expect(aggregateFunctionAmbiguityMigration).toContain(`public.${routine}`);
    expect(aggregateFunctionAmbiguityMigration).toContain("#variable_conflict use_column");
    expect(aggregateFunctionAmbiguityMigration).toContain("pg_get_functiondef");
  });
});

describe("Supabase automatic student numbers", () => {
  it("assigns a tenant-scoped sequential number under a transaction lock", () => {
    expect(automaticStudentNumbersMigration).toContain("private.assign_student_number");
    expect(automaticStudentNumbersMigration).toContain("before insert on public.students");
    expect(automaticStudentNumbersMigration).toContain("pg_advisory_xact_lock");
    expect(automaticStudentNumbersMigration).toContain("new.organization_id");
    expect(automaticStudentNumbersMigration).toContain("'STU-' || lpad");
  });
});

describe("Supabase subject catalog and automatic class codes", () => {
  it("creates tenant-scoped subject and sequence tables behind RLS", () => {
    expect(subjectCatalogAndClassCodesMigration).toContain(
      "create table if not exists public.subjects",
    );
    expect(subjectCatalogAndClassCodesMigration).toContain(
      "create table if not exists public.class_code_sequences",
    );
    expect(subjectCatalogAndClassCodesMigration).toContain(
      "alter table public.subjects enable row level security",
    );
    expect(subjectCatalogAndClassCodesMigration).toContain(
      "private.has_organization_wide_permission(organization_id, 'classes.manage')",
    );
    expect(subjectCatalogAndClassCodesMigration).toContain(
      "revoke all on table public.subjects, public.class_code_sequences from anon, authenticated",
    );
  });

  it("generates immutable organization-scoped codes atomically", () => {
    expect(subjectCatalogAndClassCodesMigration).toContain("selected_prefix := 'MIX'");
    expect(subjectCatalogAndClassCodesMigration).toContain(
      "on conflict (organization_id, prefix) do update",
    );
    expect(subjectCatalogAndClassCodesMigration).toContain(
      "persisted_class_code := selected_prefix || '-' || lpad(next_number::text, 4, '0')",
    );
    expect(subjectCatalogAndClassCodesMigration).not.toContain(
      "name = btrim(class_name), code = upper(btrim(class_code))",
    );
  });

  it("keeps column names unambiguous after replacing the aggregate function", () => {
    expect(subjectCatalogAndClassCodesMigration).toContain("#variable_conflict use_column");
    expect(automaticClassCodeAmbiguityFixMigration).toContain("public.save_class_aggregate");
    expect(automaticClassCodeAmbiguityFixMigration).toContain("#variable_conflict use_column");
    expect(automaticClassCodeAmbiguityFixMigration).toContain("pg_get_functiondef");
  });
});
