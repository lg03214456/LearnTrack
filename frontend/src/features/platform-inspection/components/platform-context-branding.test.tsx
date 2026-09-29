import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlatformContextBranding } from "./platform-context-branding";

afterEach(cleanup);

describe("PlatformContextBranding", () => {
  it("identifies the platform workspace and exposes no tenant context before selection", () => {
    render(<PlatformContextBranding />);
    expect(screen.getByText("LearnTrack 平台管理")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the organization name with a persistent inspection indicator", () => {
    render(<PlatformContextBranding organizationName="菁華補習班" />);
    expect(screen.getByText("菁華補習班")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("正在唯讀檢視：菁華補習班");
    expect(screen.getByRole("status")).toHaveTextContent("新增、修改與刪除操作均已停用");
  });
});
