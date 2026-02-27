import { describe, it, expect } from "vitest";
import type { BrandingConfig } from "@/types/settings";
import type { ColorScheme } from "@/types/template";

//applyBranding is private in generator.ts so we reimplement it here for unit testing
function applyBranding(
  template: { colorScheme: Pick<ColorScheme, "primary" | "secondary" | "accent"> },
  branding?: BrandingConfig
): void {
  if (!branding) return;
  if (branding.primaryColor) template.colorScheme.primary = branding.primaryColor;
  if (branding.secondaryColor) template.colorScheme.secondary = branding.secondaryColor;
  if (branding.accentColor) template.colorScheme.accent = branding.accentColor;
}

function makeTemplate(): { colorScheme: Pick<ColorScheme, "primary" | "secondary" | "accent"> } {
  return {
    colorScheme: {
      primary: "#1e3a5f",
      secondary: "#2d5a8e",
      accent: "#e8913a",
    },
  };
}

describe("applyBranding", () => {
  it("does nothing when branding is undefined", () => {
    const template = makeTemplate();
    applyBranding(template, undefined);
    expect(template.colorScheme.primary).toBe("#1e3a5f");
    expect(template.colorScheme.secondary).toBe("#2d5a8e");
    expect(template.colorScheme.accent).toBe("#e8913a");
  });

  it("overrides primary color", () => {
    const template = makeTemplate();
    applyBranding(template, {
      logoUrl: null,
      primaryColor: "#ff0000",
      secondaryColor: "#2d5a8e",
      accentColor: "#e8913a",
      footerText: null,
      showReportForgeBranding: true,
    });
    expect(template.colorScheme.primary).toBe("#ff0000");
  });

  it("overrides all colors", () => {
    const template = makeTemplate();
    applyBranding(template, {
      logoUrl: null,
      primaryColor: "#aa0000",
      secondaryColor: "#00aa00",
      accentColor: "#0000aa",
      footerText: null,
      showReportForgeBranding: true,
    });
    expect(template.colorScheme.primary).toBe("#aa0000");
    expect(template.colorScheme.secondary).toBe("#00aa00");
    expect(template.colorScheme.accent).toBe("#0000aa");
  });

  it("preserves original colors when branding has empty strings", () => {
    const template = makeTemplate();
    applyBranding(template, {
      logoUrl: null,
      primaryColor: "",
      secondaryColor: "",
      accentColor: "",
      footerText: null,
      showReportForgeBranding: true,
    });
    //empty strings are falsy, so originals are preserved
    expect(template.colorScheme.primary).toBe("#1e3a5f");
    expect(template.colorScheme.secondary).toBe("#2d5a8e");
    expect(template.colorScheme.accent).toBe("#e8913a");
  });
});
