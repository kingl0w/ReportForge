"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  CreditCard,
  Palette,
  AlertTriangle,
  Crown,
  ExternalLink,
  Mail,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useSubscription } from "@/hooks/useSubscription";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface UserSettings {
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

const DEFAULT_SETTINGS: UserSettings = {
  emailOnReportComplete: true,
  emailWeeklyDigest: false,
  emailMarketingUpdates: false,
  logoUrl: null,
  brandPrimary: null,
  brandSecondary: null,
  brandAccent: null,
  customFooterText: null,
  removeReportForgeBranding: false,
};

export default function SettingsPage() {
  const { user, loading: userLoading } = useUser();
  const {
    plan,
    reportsUsed,
    reportsLimit,
    isPro,
    subscription,
    openPortal,
    upgrade,
  } = useSubscription();

  const [name, setName] = useState("");
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "");
    }
  }, [user]);

  //branding form state kept separate from settings to avoid immediate API calls
  const [brandPrimary, setBrandPrimary] = useState("#1e3a5f");
  const [brandSecondary, setBrandSecondary] = useState("#2d5a8e");
  const [brandAccent, setBrandAccent] = useState("#e8913a");
  const [footerText, setFooterText] = useState("");
  const [removeBranding, setRemoveBranding] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setBrandPrimary(data.brandPrimary ?? "#1e3a5f");
        setBrandSecondary(data.brandSecondary ?? "#2d5a8e");
        setBrandAccent(data.brandAccent ?? "#e8913a");
        setFooterText(data.customFooterText ?? "");
        setRemoveBranding(data.removeReportForgeBranding ?? false);
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveEmailPreferences() {
    setSavingEmail(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOnReportComplete: settings.emailOnReportComplete,
          emailWeeklyDigest: settings.emailWeeklyDigest,
          emailMarketingUpdates: settings.emailMarketingUpdates,
        }),
      });

      if (res.ok) {
        toast.success("Email preferences saved");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save");
      }
    } catch {
      toast.error("Failed to save email preferences");
    } finally {
      setSavingEmail(false);
    }
  }

  async function saveBrandingSettings() {
    setSavingBranding(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandPrimary,
          brandSecondary,
          brandAccent,
          customFooterText: footerText || null,
          removeReportForgeBranding: removeBranding,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        toast.success("Branding settings saved");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save");
      }
    } catch {
      toast.error("Failed to save branding settings");
    } finally {
      setSavingBranding(false);
    }
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await fetch("/api/settings/logo", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, logoUrl: data.logoUrl }));
        toast.success("Logo uploaded");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to upload logo");
      }
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name },
      });
      if (error) throw error;
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLogoRemove() {
    try {
      const res = await fetch("/api/settings/logo", { method: "DELETE" });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, logoUrl: null }));
        toast.success("Logo removed");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to remove logo");
      }
    } catch {
      toast.error("Failed to remove logo");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, email preferences, and report branding.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-foreground">Profile</CardTitle>
          </div>
          <CardDescription>
            Your personal information and avatar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.user_metadata?.avatar_url ?? ""} alt={name} />
              <AvatarFallback className="bg-primary/20 text-lg text-primary">
                {name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button size="sm" className="bg-secondary border border-border text-foreground hover:bg-accent">
                Change avatar
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG or GIF. Max 2MB.
              </p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-border pt-6">
          <Button
            className="bg-primary text-primary-foreground font-medium hover:bg-primary/90"
            onClick={saveProfile}
            disabled={savingProfile || userLoading}
          >
            {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-foreground">
              Email Notifications
            </CardTitle>
          </div>
          <CardDescription>
            Choose which emails you&apos;d like to receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Report complete notifications
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Get emailed when a report finishes generating.
                  </p>
                </div>
                <Switch
                  checked={settings.emailOnReportComplete}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      emailOnReportComplete: checked,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        Weekly digest
                      </p>
                      {!isPro && (
                        <Badge variant="secondary" className="text-xs">
                          Pro
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Summary of your reports every Monday morning.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.emailWeeklyDigest}
                  disabled={!isPro}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      emailWeeklyDigest: checked,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Product updates
                  </p>
                  <p className="text-sm text-muted-foreground">
                    New features, tips, and occasional updates.
                  </p>
                </div>
                <Switch
                  checked={settings.emailMarketingUpdates}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      emailMarketingUpdates: checked,
                    }))
                  }
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="border-t border-border pt-6">
          <Button
            className="bg-primary text-primary-foreground font-medium hover:bg-primary/90"
            onClick={saveEmailPreferences}
            disabled={savingEmail || loading}
          >
            {savingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save email preferences
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-foreground">
              Report Branding
            </CardTitle>
            {!isPro && (
              <Badge variant="secondary" className="text-xs">
                Pro
              </Badge>
            )}
          </div>
          <CardDescription>
            Customize the look and feel of your generated reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isPro ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border p-8 text-center">
              <Crown className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  Upgrade to Pro for custom branding
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add your logo, custom colors, and remove ReportForge branding
                  from all generated reports.
                </p>
              </div>
              <Button
                className="bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                onClick={() => upgrade("PRO")}
              >
                Upgrade to Pro — $10/month
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Company logo</Label>
                {settings.logoUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 items-center rounded-lg border border-border bg-muted/50 px-4">
                      {/*eslint-disable-next-line @next/next/no-img-element*/}
                      <img
                        src={settings.logoUrl}
                        alt="Brand logo"
                        className="max-h-12 max-w-[200px] object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-secondary border border-border text-foreground hover:bg-accent"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        Replace
                      </Button>
                      <Button
                        size="sm"
                        className="bg-secondary border border-border text-foreground hover:bg-accent"
                        onClick={handleLogoRemove}
                      >
                        <X className="mr-1 h-3 w-3" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary hover:bg-primary/5"
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {uploadingLogo
                        ? "Uploading..."
                        : "Click to upload logo (PNG, JPG, WebP — max 2MB)"}
                    </span>
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Brand colors</Label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label
                      htmlFor="brand-primary"
                      className="text-xs text-muted-foreground"
                    >
                      Primary
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandPrimary}
                        onChange={(e) => setBrandPrimary(e.target.value)}
                        className="h-8 w-8 cursor-pointer rounded border border-border"
                      />
                      <Input
                        id="brand-primary"
                        value={brandPrimary}
                        onChange={(e) => setBrandPrimary(e.target.value)}
                        className="w-full font-mono text-sm"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="brand-secondary"
                      className="text-xs text-muted-foreground"
                    >
                      Secondary
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandSecondary}
                        onChange={(e) => setBrandSecondary(e.target.value)}
                        className="h-8 w-8 cursor-pointer rounded border border-border"
                      />
                      <Input
                        id="brand-secondary"
                        value={brandSecondary}
                        onChange={(e) => setBrandSecondary(e.target.value)}
                        className="w-full font-mono text-sm"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="brand-accent"
                      className="text-xs text-muted-foreground"
                    >
                      Accent
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandAccent}
                        onChange={(e) => setBrandAccent(e.target.value)}
                        className="h-8 w-8 cursor-pointer rounded border border-border"
                      />
                      <Input
                        id="brand-accent"
                        value={brandAccent}
                        onChange={(e) => setBrandAccent(e.target.value)}
                        className="w-full font-mono text-sm"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="footer-text">Custom footer text</Label>
                <Input
                  id="footer-text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="e.g. Confidential — Acme Corp"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  Replaces &quot;Confidential&quot; on the cover page footer.{" "}
                  {footerText.length}/200 characters.
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Remove &quot;Generated by ReportForge&quot; branding
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Removes ReportForge attribution from report covers and
                    footers.
                  </p>
                </div>
                <Switch
                  checked={removeBranding}
                  onCheckedChange={setRemoveBranding}
                />
              </div>
            </div>
          )}
        </CardContent>
        {isPro && !loading && (
          <CardFooter className="border-t border-border pt-6">
            <Button
              className="bg-primary text-primary-foreground font-medium hover:bg-primary/90"
              onClick={saveBrandingSettings}
              disabled={savingBranding}
            >
              {savingBranding && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save branding
            </Button>
          </CardFooter>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-foreground">Subscription</CardTitle>
          </div>
          <CardDescription>
            Manage your plan and billing information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Crown className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">
                    {plan === "PRO" ? "Pro Plan" : plan === "PER_REPORT" ? "Pay Per Report" : "Free Plan"}
                  </p>
                  <Badge variant="secondary">Current</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan === "PRO"
                    ? "100 reports/month, all templates"
                    : plan === "PER_REPORT"
                    ? "Pay per report, all templates"
                    : `${reportsLimit} reports included`}
                </p>
              </div>
            </div>
            {plan !== "PRO" && (
              <Button
                className="bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                onClick={() => upgrade("PRO")}
              >
                Upgrade to Pro
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Reports used</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {reportsUsed}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  / {reportsLimit}
                </span>
              </p>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${reportsLimit > 0 ? Math.min(100, (reportsUsed / reportsLimit) * 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Billing period</p>
              {subscription ? (
                <>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {subscription.cancelAtPeriodEnd
                      ? "Cancels at period end"
                      : `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    &mdash;
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    No active subscription
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Pro Plan &mdash; $10/month
              </p>
              <p className="text-sm text-muted-foreground">
                100 reports/month, all templates, priority generation
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-primary text-primary"
            >
              Recommended
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="border-t border-border pt-6">
          <Button
            size="sm"
            className="bg-secondary border border-border text-foreground hover:bg-accent"
            onClick={openPortal}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Manage billing
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-destructive/50 bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Irreversible actions that affect your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Delete account
              </p>
              <p className="text-sm text-muted-foreground">
                Permanently remove your account and all data. This cannot be
                undone.
              </p>
            </div>
            <Button size="sm" className="bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30">
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
