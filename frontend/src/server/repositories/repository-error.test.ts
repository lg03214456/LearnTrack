import { describe, expect, it } from "vitest";
import { mapRepositoryError } from "./repository-error";

describe("repository error mapping", () => {
  it.each([
    ["23505", "CONFLICT"],
    ["40001", "CONFLICT"],
    ["23503", "INVALID_RELATIONSHIP"],
    ["23514", "INVALID_RELATIONSHIP"],
    ["42501", "FORBIDDEN"],
    ["PGRST116", "NOT_FOUND"],
    ["unknown", "PERSISTENCE_UNAVAILABLE"],
  ])("maps %s to %s without exposing provider details", (providerCode, expectedCode) => {
    const mapped = mapRepositoryError({ code: providerCode, message: "database detail" });
    expect(mapped.code).toBe(expectedCode);
    expect(mapped.message).toBe(expectedCode);
    expect(mapped.message).not.toContain("database detail");
  });
});
