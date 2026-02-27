import { describe, it, expect } from "vitest";
import { matchTemplate } from "@/lib/analytics/template-matcher";
import type { DataProfile } from "@/types/report";

function makeProfile(overrides: Partial<DataProfile> = {}): DataProfile {
  return {
    rowCount: 100,
    dateRange: null,
    numericColumns: [],
    categoricalColumns: [],
    dateColumns: [],
    currencyColumns: [],
    percentageColumns: [],
    ...overrides,
  };
}

describe("matchTemplate", () => {
  it("matches sales-report template", () => {
    const profile = makeProfile({
      numericColumns: ["revenue", "orders", "aov"],
      dateColumns: ["date"],
    });
    expect(matchTemplate(profile)).toBe("sales-report");
  });

  it("matches social-media template", () => {
    const profile = makeProfile({
      numericColumns: ["followers", "likes", "engagement_rate"],
      categoricalColumns: ["platform"],
    });
    expect(matchTemplate(profile)).toBe("social-media");
  });

  it("matches crypto-wallet template", () => {
    const profile = makeProfile({
      numericColumns: ["gas_fee", "token_amount"],
      categoricalColumns: ["wallet_address"],
    });
    expect(matchTemplate(profile)).toBe("crypto-wallet");
  });

  it("matches ecommerce template", () => {
    const profile = makeProfile({
      numericColumns: ["quantity", "unit_price"],
      categoricalColumns: ["product_name", "sku_code"],
    });
    expect(matchTemplate(profile)).toBe("ecommerce");
  });

  it("matches analytics template", () => {
    const profile = makeProfile({
      numericColumns: ["sessions", "pageviews", "bounce_rate"],
      dateColumns: ["date"],
    });
    expect(matchTemplate(profile)).toBe("analytics");
  });

  it("matches financial template", () => {
    const profile = makeProfile({
      numericColumns: ["debit", "credit", "balance"],
      categoricalColumns: ["account"],
    });
    expect(matchTemplate(profile)).toBe("financial");
  });

  it("returns custom for unrecognized columns", () => {
    const profile = makeProfile({
      numericColumns: ["xyz_metric", "abc_value"],
      categoricalColumns: ["random_col"],
    });
    expect(matchTemplate(profile)).toBe("custom");
  });

  it("picks template with most matches", () => {
    const profile = makeProfile({
      numericColumns: [
        "revenue",
        "sales",
        "orders",
        "sessions",
      ],
      dateColumns: ["date"],
    });
    expect(matchTemplate(profile)).toBe("sales-report");
  });

  it("uses single-match fallback for high-confidence keywords", () => {
    const profile = makeProfile({
      numericColumns: ["revenue"],
      categoricalColumns: ["random"],
    });
    const result = matchTemplate(profile);
    expect(result).toBe("sales-report");
  });

  it("handles case-insensitive matching", () => {
    const profile = makeProfile({
      numericColumns: ["Revenue", "ORDERS"],
      dateColumns: ["Date"],
    });
    expect(matchTemplate(profile)).toBe("sales-report");
  });

  it("handles empty profile", () => {
    const profile = makeProfile();
    expect(matchTemplate(profile)).toBe("custom");
  });
});
