import { describe, it, expect } from "vitest";
import { z } from "zod/v4";

//replicated from the settings API route for unit testing
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const patchSchema = z.object({
  emailOnReportComplete: z.boolean().optional(),
  emailWeeklyDigest: z.boolean().optional(),
  emailMarketingUpdates: z.boolean().optional(),
  brandPrimary: z.string().regex(HEX_COLOR).nullable().optional(),
  brandSecondary: z.string().regex(HEX_COLOR).nullable().optional(),
  brandAccent: z.string().regex(HEX_COLOR).nullable().optional(),
  customFooterText: z.string().max(200).nullable().optional(),
  removeReportForgeBranding: z.boolean().optional(),
});

const BRANDING_FIELDS = new Set([
  "brandPrimary",
  "brandSecondary",
  "brandAccent",
  "customFooterText",
  "removeReportForgeBranding",
]);

describe("Settings PATCH validation", () => {
  it("accepts valid email preferences", () => {
    const result = patchSchema.safeParse({
      emailOnReportComplete: true,
      emailWeeklyDigest: false,
      emailMarketingUpdates: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid branding fields", () => {
    const result = patchSchema.safeParse({
      brandPrimary: "#ff5500",
      brandSecondary: "#00aa55",
      brandAccent: "#5500ff",
      customFooterText: "Acme Corp Confidential",
      removeReportForgeBranding: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid hex colors", () => {
    const result = patchSchema.safeParse({
      brandPrimary: "not-a-color",
    });
    expect(result.success).toBe(false);
  });

  it("rejects hex colors without hash", () => {
    const result = patchSchema.safeParse({
      brandPrimary: "ff5500",
    });
    expect(result.success).toBe(false);
  });

  it("rejects 3-digit hex colors", () => {
    const result = patchSchema.safeParse({
      brandPrimary: "#f50",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null for nullable fields", () => {
    const result = patchSchema.safeParse({
      brandPrimary: null,
      customFooterText: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects footer text over 200 chars", () => {
    const result = patchSchema.safeParse({
      customFooterText: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("accepts footer text at exactly 200 chars", () => {
    const result = patchSchema.safeParse({
      customFooterText: "x".repeat(200),
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = patchSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects non-boolean for email fields", () => {
    const result = patchSchema.safeParse({
      emailOnReportComplete: "yes",
    });
    expect(result.success).toBe(false);
  });
});

describe("Branding field detection", () => {
  it("detects branding fields", () => {
    const updates = { brandPrimary: "#ff0000", emailOnReportComplete: true };
    const hasBranding = Object.keys(updates).some((k) => BRANDING_FIELDS.has(k));
    expect(hasBranding).toBe(true);
  });

  it("returns false for email-only updates", () => {
    const updates = { emailOnReportComplete: false, emailWeeklyDigest: true };
    const hasBranding = Object.keys(updates).some((k) => BRANDING_FIELDS.has(k));
    expect(hasBranding).toBe(false);
  });

  it("detects removeReportForgeBranding as branding field", () => {
    const updates = { removeReportForgeBranding: true };
    const hasBranding = Object.keys(updates).some((k) => BRANDING_FIELDS.has(k));
    expect(hasBranding).toBe(true);
  });
});
