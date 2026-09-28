import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import { Shell } from "./shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/classes",
}));

vi.mock("@/app/actions/access-actions", () => ({
  selectPersona: vi.fn(),
}));
vi.mock("@/app/actions/authentication-actions", () => ({
  logoutAction: vi.fn(),
}));

afterEach(cleanup);

const actor: AuthorizationContext = {
  actorType: "organization",
  profileId: "owner",
  membershipId: "membership-1",
  organizationId: "organization-1",
  name: "測試負責人",
  email: "owner@example.com",
  roleId: "owner",
  roleName: "負責人",
  status: "active",
  permissions: ["students.read", "progress.read", "classes.read"],
  scope: { kind: "organization-wide" },
};

describe("Shell", () => {
  it("uses the student directory as the primary navigation entry", () => {
    render(
      <Shell actor={actor} organizationName="晨星文理補習班" isMockMode>
        內容
      </Shell>,
    );

    expect(screen.getByRole("link", { name: "返回學生名單主頁" })).toHaveAttribute(
      "href",
      "/students",
    );
    expect(screen.getByText("晨星文理補習班")).toBeInTheDocument();

    const teachingNavigation = screen.getByText("教學功能").nextElementSibling;
    const links = Array.from(teachingNavigation?.querySelectorAll("a") ?? []);
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      "學生名單",
      "學生進度",
      "課程班級",
    ]);
  });

  it("does not expose Mock controls in production mode", () => {
    render(
      <Shell actor={actor} organizationName="晨星文理補習班" isMockMode={false}>
        內容
      </Shell>,
    );

    expect(screen.queryByLabelText("切換假帳號")).not.toBeInTheDocument();
    expect(screen.queryByText(/Mock 開發模式/)).not.toBeInTheDocument();
  });
});
