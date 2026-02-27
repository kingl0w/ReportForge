-- ============================================================
-- Storage Buckets & Comprehensive Row-Level Security
-- ============================================================
-- This migration sets up:
--   1. Supabase Storage buckets (reports, uploads, logos, previews)
--   2. RLS policies on storage.objects for path-based ownership
--   3. RLS policies on all application tables
--   4. StripeEvent table (service-role only, no user access)
--   5. Auto-user-creation trigger with UserSettings defaults
--
-- Path convention for storage: {bucket}/{userId}/{filename}
-- Ownership verified by matching first path segment to auth.uid()
-- ============================================================


-- ============================================================
-- PART 1: Storage Buckets
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'reports',
    'reports',
    false,           -- Private: only owner can access
    52428800,        -- 50 MB
    ARRAY[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'uploads',
    'uploads',
    false,           -- Private: only owner can access
    26214400,        -- 25 MB
    ARRAY[
      'text/csv',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ]
  ),
  (
    'logos',
    'logos',
    true,            -- Public read for white-label report rendering
    5242880,         -- 5 MB
    ARRAY[
      'image/png',
      'image/jpeg',
      'image/svg+xml',
      'image/webp'
    ]
  ),
  (
    'previews',
    'previews',
    true,            -- Public read for email/sharing links
    10485760,        -- 10 MB
    ARRAY[
      'image/png',
      'image/jpeg',
      'image/webp'
    ]
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ============================================================
-- PART 2: Storage Object RLS Policies
-- ============================================================

-- --------------------
-- reports bucket (private)
-- --------------------
-- Path: reports/{userId}/{reportId}.{pdf|docx}

DROP POLICY IF EXISTS "Users can read own reports" ON storage.objects;
CREATE POLICY "Users can read own reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can upload own reports" ON storage.objects;
CREATE POLICY "Users can upload own reports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own reports" ON storage.objects;
CREATE POLICY "Users can delete own reports"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- --------------------
-- uploads bucket (private)
-- --------------------
-- Path: uploads/{userId}/{timestamp}_{filename}
--
-- CLEANUP NOTE: Files in this bucket should be deleted after 24 hours.
-- Use the deleteExpiredUploads() utility in src/lib/supabase/storage.ts,
-- or configure a Supabase cron job / pg_cron extension:
--
--   SELECT cron.schedule(
--     'cleanup-expired-uploads',
--     '0 * * * *',  -- every hour
--     $$DELETE FROM storage.objects
--       WHERE bucket_id = 'uploads'
--       AND created_at < now() - interval '24 hours'$$
--   );

DROP POLICY IF EXISTS "Users can read own uploads" ON storage.objects;
CREATE POLICY "Users can read own uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can upload own data files" ON storage.objects;
CREATE POLICY "Users can upload own data files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- --------------------
-- logos bucket (public read, owner write)
-- --------------------
-- Path: logos/{userId}/logo.{ext}

DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
CREATE POLICY "Anyone can view logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Users can upload own logo" ON storage.objects;
CREATE POLICY "Users can upload own logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own logo" ON storage.objects;
CREATE POLICY "Users can update own logo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own logo" ON storage.objects;
CREATE POLICY "Users can delete own logo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- --------------------
-- previews bucket (public read, owner write)
-- --------------------
-- Path: previews/{userId}/{reportId}_preview.{png|jpg}

DROP POLICY IF EXISTS "Anyone can view previews" ON storage.objects;
CREATE POLICY "Anyone can view previews"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'previews');

DROP POLICY IF EXISTS "Users can upload own previews" ON storage.objects;
CREATE POLICY "Users can upload own previews"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'previews'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own previews" ON storage.objects;
CREATE POLICY "Users can update own previews"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'previews'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'previews'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own previews" ON storage.objects;
CREATE POLICY "Users can delete own previews"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'previews'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- PART 3: Application Table RLS Policies
-- ============================================================
-- These policies supersede the standalone supabase/policies.sql file.
-- ============================================================

-- --------------------
-- User table
-- --------------------

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON "User";
CREATE POLICY "Users can view their own profile"
  ON "User" FOR SELECT
  USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON "User";
CREATE POLICY "Users can update their own profile"
  ON "User" FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- --------------------
-- Report table
-- --------------------

ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reports" ON "Report";
CREATE POLICY "Users can view their own reports"
  ON "Report" FOR SELECT
  USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Anyone can view public reports" ON "Report";
CREATE POLICY "Anyone can view public reports"
  ON "Report" FOR SELECT
  USING ("isPublic" = true);

DROP POLICY IF EXISTS "Users can create their own reports" ON "Report";
CREATE POLICY "Users can create their own reports"
  ON "Report" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can update their own reports" ON "Report";
CREATE POLICY "Users can update their own reports"
  ON "Report" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can delete their own reports" ON "Report";
CREATE POLICY "Users can delete their own reports"
  ON "Report" FOR DELETE
  USING (auth.uid()::text = "userId");

-- --------------------
-- UserTemplate table
-- --------------------

ALTER TABLE "UserTemplate" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own templates" ON "UserTemplate";
CREATE POLICY "Users can view their own templates"
  ON "UserTemplate" FOR SELECT
  USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can view public templates" ON "UserTemplate";
CREATE POLICY "Users can view public templates"
  ON "UserTemplate" FOR SELECT
  USING ("isPublic" = true);

DROP POLICY IF EXISTS "Users can create their own templates" ON "UserTemplate";
CREATE POLICY "Users can create their own templates"
  ON "UserTemplate" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can update their own templates" ON "UserTemplate";
CREATE POLICY "Users can update their own templates"
  ON "UserTemplate" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can delete their own templates" ON "UserTemplate";
CREATE POLICY "Users can delete their own templates"
  ON "UserTemplate" FOR DELETE
  USING (auth.uid()::text = "userId");

-- --------------------
-- DataConnection table
-- --------------------

ALTER TABLE "DataConnection" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own connections" ON "DataConnection";
CREATE POLICY "Users can view their own connections"
  ON "DataConnection" FOR SELECT
  USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can create their own connections" ON "DataConnection";
CREATE POLICY "Users can create their own connections"
  ON "DataConnection" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can update their own connections" ON "DataConnection";
CREATE POLICY "Users can update their own connections"
  ON "DataConnection" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can delete their own connections" ON "DataConnection";
CREATE POLICY "Users can delete their own connections"
  ON "DataConnection" FOR DELETE
  USING (auth.uid()::text = "userId");

-- --------------------
-- Subscription table
-- --------------------
-- Read-only for users. All mutations via Stripe webhooks (service role).

ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscription" ON "Subscription";
CREATE POLICY "Users can view their own subscription"
  ON "Subscription" FOR SELECT
  USING (auth.uid()::text = "userId");

-- --------------------
-- UserSettings table
-- --------------------
-- Full CRUD on own row only.

ALTER TABLE "UserSettings" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own settings" ON "UserSettings";
CREATE POLICY "Users can view their own settings"
  ON "UserSettings" FOR SELECT
  USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can create their own settings" ON "UserSettings";
CREATE POLICY "Users can create their own settings"
  ON "UserSettings" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can update their own settings" ON "UserSettings";
CREATE POLICY "Users can update their own settings"
  ON "UserSettings" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can delete their own settings" ON "UserSettings";
CREATE POLICY "Users can delete their own settings"
  ON "UserSettings" FOR DELETE
  USING (auth.uid()::text = "userId");

-- --------------------
-- StripeEvent table
-- --------------------
-- Idempotent Stripe webhook event log.
-- NO user-facing policies — only accessible via service role.
-- Service role bypasses RLS automatically.
-- Table structure matches prisma/schema.prisma StripeEvent model.

CREATE TABLE IF NOT EXISTS "StripeEvent" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "stripeEventId" TEXT NOT NULL UNIQUE,                -- Stripe event ID (evt_...)
  type            TEXT NOT NULL,                        -- e.g. invoice.paid
  data            JSONB NOT NULL DEFAULT '{}',
  "processedAt"   TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "StripeEvent" ENABLE ROW LEVEL SECURITY;

-- No policies defined = zero access for anon/authenticated roles.
-- Only the service role (admin client) can read/write this table.


-- ============================================================
-- PART 4: Auth Trigger — Auto-create User + UserSettings
-- ============================================================

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

  -- Auto-create default UserSettings for the new user
  INSERT INTO public."UserSettings" (id, "userId", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    NEW.id::text,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
