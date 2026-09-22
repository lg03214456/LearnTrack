import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountsView } from "./accounts-view";
import { RolesView } from "./roles-view";
vi.mock("@/app/actions/access-actions", () => ({
  createAccountAction: vi.fn(),
  manageAccountCredentialAction: vi.fn(),
  updateAccountAction: vi.fn(),
  updateRoleAction: vi.fn(),
}));
const roles = [
  {
    id: "admin",
    name: "管理員",
    description: "管理系統",
    isSystem: false,
    version: 1,
    memberCount: 2,
    permissions: ["students.read" as const],
  },
  {
    id: "teacher",
    name: "教師",
    description: "授課使用",
    isSystem: true,
    version: 1,
    memberCount: 3,
    permissions: [],
  },
];
const permissions = [{ code: "students.read" as const, module: "學生管理", label: "查看學生" }];
describe("access-control views", () => {
  it("renders account scope and rows", () => {
    render(
      <AccountsView
        canManageOwner
        classes={[]}
        data={{
          rows: [
            {
              id: "m1",
              name: "林老師",
              email: "lin@example.com",
              roleId: "teacher",
              roleName: "教師",
              status: "active",
              classNames: ["數學班"],
              scopeLabel: "數學班",
            },
          ],
          roles: [{ id: "teacher", name: "教師" }],
          summary: { total: 1, active: 1, inactive: 0 },
          pagination: { page: 1, total: 1 },
        }}
      />,
    );
    expect(screen.getByText("帳號總數")).toBeInTheDocument();
    expect(screen.getByText("lin@example.com")).toBeInTheDocument();
    expect(screen.getByText("數學班")).toBeInTheDocument();
    expect(screen.getByText("新增登入帳號")).toBeInTheDocument();
    expect(screen.getByText("管理", { selector: "summary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "停用帳號" })).toBeInTheDocument();
  });
  it("switches the selected role editor", () => {
    render(<RolesView roles={roles} permissions={permissions} canManage />);
    expect(screen.getByRole("heading", { name: "管理員權限" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /教師/ }));
    expect(screen.getByRole("heading", { name: "教師權限" })).toBeInTheDocument();
  });
});
