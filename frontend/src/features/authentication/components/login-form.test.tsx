import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

vi.mock("@/app/actions/authentication-actions", () => ({ loginAction: vi.fn() }));
afterEach(cleanup);

describe("LoginForm", () => {
  it("provides an accessible closed login without registration", () => {
    render(<LoginForm isMockMode />);
    expect(screen.getByLabelText("登入信箱")).toHaveFocus();
    expect(screen.getByLabelText("密碼")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "登入" })).toBeEnabled();
    expect(screen.queryByRole("link", { name: /註冊/ })).not.toBeInTheDocument();
    expect(screen.getByText(/owner@learntrack.test/)).toBeInTheDocument();
  });

  it("hides seeded credentials outside Mock mode", () => {
    render(<LoginForm isMockMode={false} />);
    expect(screen.queryByText(/owner@learntrack.test/)).not.toBeInTheDocument();
  });

  it("fails closed when the production provider is unavailable", () => {
    render(<LoginForm isMockMode={false} providerAvailable={false} />);
    expect(screen.getByRole("button", { name: "登入服務未設定" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("系統已停止登入");
  });
});
