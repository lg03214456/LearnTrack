import "server-only";

export type RepositoryErrorCode =
  "CONFLICT" | "FORBIDDEN" | "INVALID_RELATIONSHIP" | "NOT_FOUND" | "PERSISTENCE_UNAVAILABLE";

export class RepositoryError extends Error {
  constructor(
    public readonly code: RepositoryErrorCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "RepositoryError";
  }
}

interface PostgrestErrorLike {
  code?: string;
  message?: string;
}

export function mapRepositoryError(error: unknown): RepositoryError {
  const postgrestError =
    typeof error === "object" && error !== null ? (error as PostgrestErrorLike) : null;
  const code = postgrestError?.code ?? null;
  if (process.env.NODE_ENV !== "production")
    console.error("Repository operation failed", {
      code,
      message: postgrestError?.message ?? "Unknown repository error",
    });
  if (code === "23505" || code === "40001")
    return new RepositoryError("CONFLICT", { cause: error });
  if (code === "23503" || code === "23514")
    return new RepositoryError("INVALID_RELATIONSHIP", { cause: error });
  if (code === "42501") return new RepositoryError("FORBIDDEN", { cause: error });
  if (code === "PGRST116") return new RepositoryError("NOT_FOUND", { cause: error });
  if (code === "P0002") return new RepositoryError("NOT_FOUND", { cause: error });
  return new RepositoryError("PERSISTENCE_UNAVAILABLE", { cause: error });
}
