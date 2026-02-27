-- Add isPublic column to Report table for shareable interactive reports
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT false;
