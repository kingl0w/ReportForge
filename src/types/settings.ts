export interface UserSettingsData {
  emailOnReportComplete: boolean;
  emailWeeklyDigest: boolean;
  emailMarketingUpdates: boolean;
  logoUrl: string | null;
  brandPrimary: string | null;
  brandSecondary: string | null;
  brandAccent: string | null;
  customFooterText: string | null;
  removeReportForgeBranding: boolean;
}

export interface BrandingConfig {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  footerText: string | null;
  showReportForgeBranding: boolean;
}
