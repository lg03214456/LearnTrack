import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseResetPasswordForm } from "./supabase-reset-password-form";

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  setSession: vi.fn(),
  getSession: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase/browser-client", () => ({
  getSupabaseBrowserClient: () => ({ auth }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const session = { access_token: "access", refresh_token: "refresh" };

describe("SupabaseResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.exchangeCodeForSession.mockResolvedValue({ data: { session }, error: null });
    auth.setSession.mockResolvedValue({ data: { session }, error: null });
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    window.history.replaceState(null, "", "/password/reset");
  });

  it("exchanges a PKCE code and removes it from the URL before showing the form", async () => {
    window.history.replaceState(null, "", "/password/reset?code=recovery-code");

    render(<SupabaseResetPasswordForm />);

    expect(await screen.findByLabelText("新密碼（至少 12 個字元）")).toBeInTheDocument();
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("recovery-code");
    expect(window.location.pathname).toBe("/password/reset");
    expect(window.location.search).toBe("");
  });

  it("accepts implicit recovery tokens and removes the URL fragment", async () => {
    window.history.replaceState(
      null,
      "",
      "/password/reset#access_token=access&refresh_token=refresh&type=recovery",
    );

    render(<SupabaseResetPasswordForm />);

    expect(await screen.findByLabelText("新密碼（至少 12 個字元）")).toBeInTheDocument();
    expect(auth.setSession).toHaveBeenCalledWith({
      access_token: "access",
      refresh_token: "refresh",
    });
    expect(window.location.hash).toBe("");
  });

  it("shows an invalid-link message when no recovery session exists", async () => {
    render(<SupabaseResetPasswordForm />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("連結無效或已過期"));
  });
});
