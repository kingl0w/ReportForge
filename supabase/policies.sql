-- ============================================================
-- Row Level Security (RLS) Policies for ReportForge
-- ============================================================
-- These policies ensure users can only access their own data.
-- Apply after running Prisma migrations to create the tables.
--
-- Prerequisites:
--   ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "UserTemplate" ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "DataConnection" ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
-- ============================================================

-- ==================
-- User table
-- ==================
-- Users can read and update their own profile.
-- Insert is handled by auth trigger (see below).

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON "User" FOR SELECT
  USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile"
  ON "User" FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- ==================
-- Report table
-- ==================
-- Users can CRUD their own reports only.

ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
  ON "Report" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create their own reports"
  ON "Report" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own reports"
  ON "Report" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete their own reports"
  ON "Report" FOR DELETE
  USING (auth.uid()::text = "userId");

-- ==================
-- UserTemplate table
-- ==================
-- Users can CRUD their own templates.
-- Public templates are readable by all authenticated users.

ALTER TABLE "UserTemplate" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates"
  ON "UserTemplate" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view public templates"
  ON "UserTemplate" FOR SELECT
  USING ("isPublic" = true);

CREATE POLICY "Users can create their own templates"
  ON "UserTemplate" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own templates"
  ON "UserTemplate" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete their own templates"
  ON "UserTemplate" FOR DELETE
  USING (auth.uid()::text = "userId");

-- ==================
-- DataConnection table
-- ==================
-- Users can CRUD their own API connections only.
-- Contains encrypted credentials — strict isolation.

ALTER TABLE "DataConnection" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections"
  ON "DataConnection" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create their own connections"
  ON "DataConnection" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own connections"
  ON "DataConnection" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete their own connections"
  ON "DataConnection" FOR DELETE
  USING (auth.uid()::text = "userId");

-- ==================
-- Subscription table
-- ==================
-- Users can only view their own subscription.
-- Mutations handled server-side via Stripe webhooks (service role).

ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON "Subscription" FOR SELECT
  USING (auth.uid()::text = "userId");

-- ==================
-- UserSettings table
-- ==================
-- Users can read and update their own settings.
-- Insert/delete handled server-side (service role).

ALTER TABLE "UserSettings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON "UserSettings" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own settings"
  ON "UserSettings" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ============================================================
-- Helper: Auto-create User row on Supabase auth signup
-- ============================================================
-- This trigger creates a User row when a new auth.users record
-- is created, syncing the Supabase auth user with our User table.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, "createdAt", "updatedAt")
  VALUES (
    NEW.id::text,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
