import { describe, expect, it, vi } from "vitest";
import { getAuthenticatedActor } from "@/server/auth/identity";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/server/auth/identity", () => ({ getAuthenticatedActor: vi.fn() }));

import PlatformLayout from "./layout";

describe("PlatformLayout", () => {
  it("rejects organization actors", async () => {
    vi.mocked(getAuthenticatedActor).mockResolvedValue({ actorType: "organization" } as never);
    await expect(PlatformLayout({ children: "content" })).rejects.toThrow("REDIRECT:/students");
  });

  it("allows an authenticated platform actor", async () => {
    vi.mocked(getAuthenticatedActor).mockResolvedValue({ actorType: "platform" } as never);
    await expect(PlatformLayout({ children: "content" })).resolves.toBe("content");
  });
});
