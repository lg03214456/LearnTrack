import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Analytics } from "@/features/analytics/analytics.types";
import { AnalyticsView } from "./analytics-view";

const emptyAnalytics: Analytics = {
  hasData: false,
  averageScore: null,
  completion: null,
  participation: 0,
  excellentStudents: 0,
  atRisk: 0,
  trend: [],
  bands: [],
  classes: [
    {
      name: "測試班",
      teacher: "未指派",
      progress: null,
      score: null,
      status: "尚無紀錄",
    },
  ],
};

describe("analytics view", () => {
  afterEach(cleanup);

  it("shows empty states instead of preset metrics when no records exist", () => {
    render(<AnalyticsView analytics={emptyAnalytics} />);

    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(screen.getByText("尚無評量趨勢資料")).toBeInTheDocument();
    expect(screen.getByText("尚無成績分佈資料")).toBeInTheDocument();
    expect(screen.queryByText("78.5分")).not.toBeInTheDocument();
    expect(screen.queryByText("45位")).not.toBeInTheDocument();
  });
});
