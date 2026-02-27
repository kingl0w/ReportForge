-- ActivityLog table for application event tracking and abuse monitoring
CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "ip" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog" ("userId", "createdAt");
CREATE INDEX "ActivityLog_action_createdAt_idx" ON "ActivityLog" ("action", "createdAt");
CREATE INDEX "ActivityLog_ip_createdAt_idx" ON "ActivityLog" ("ip", "createdAt");
