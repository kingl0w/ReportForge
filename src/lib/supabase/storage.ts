import { createAdminClient } from "./admin";

/*must match the buckets created in
 * supabase/migrations/20260227120000_storage_and_rls.sql*/
const BUCKET = {
  REPORTS: "reports",
  UPLOADS: "uploads",
  LOGOS: "logos",
  PREVIEWS: "previews",
} as const;

type FileBody = Buffer | Blob | ArrayBuffer;

/*uses the admin client (service role) since report generation
 * runs in background jobs, not in a user request context.*/
export async function uploadReport(
  userId: string,
  file: FileBody,
  reportId: string,
  format: "pdf" | "docx" = "pdf"
): Promise<string> {
  const admin = createAdminClient();
  const path = `${userId}/${reportId}.${format}`;
  const contentType =
    format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const { error } = await admin.storage
    .from(BUCKET.REPORTS)
    .upload(path, file, { contentType, upsert: true });

  if (error) throw new Error(`Failed to upload report: ${error.message}`);
  return path;
}

/**expires after 1 hour*/
export async function getReportUrl(
  userId: string,
  reportId: string,
  format: "pdf" | "docx" = "pdf"
): Promise<string> {
  const admin = createAdminClient();
  const path = `${userId}/${reportId}.${format}`;

  const { data, error } = await admin.storage
    .from(BUCKET.REPORTS)
    .createSignedUrl(path, 3600);

  if (error || !data) {
    throw new Error(`Failed to generate report URL: ${error?.message}`);
  }
  return data.signedUrl;
}

export async function deleteReport(
  userId: string,
  reportId: string,
  format: "pdf" | "docx" = "pdf"
): Promise<void> {
  const admin = createAdminClient();
  const path = `${userId}/${reportId}.${format}`;

  const { error } = await admin.storage.from(BUCKET.REPORTS).remove([path]);
  if (error) throw new Error(`Failed to delete report: ${error.message}`);
}

export async function uploadDataFile(
  userId: string,
  file: File
): Promise<string> {
  const admin = createAdminClient();
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${timestamp}_${safeName}`;

  const { error } = await admin.storage
    .from(BUCKET.UPLOADS)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(`Failed to upload data file: ${error.message}`);
  return path;
}

export async function getUploadUrl(
  userId: string,
  storagePath: string
): Promise<string> {
  const admin = createAdminClient();

  //ensure the path belongs to this user
  if (!storagePath.startsWith(`${userId}/`)) {
    throw new Error("Access denied: path does not belong to user");
  }

  const { data, error } = await admin.storage
    .from(BUCKET.UPLOADS)
    .createSignedUrl(storagePath, 3600);

  if (error || !data) {
    throw new Error(`Failed to generate upload URL: ${error?.message}`);
  }
  return data.signedUrl;
}

/**intended to be called from a cron job or scheduled Edge Function*/
export async function deleteExpiredUploads(): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  //list top-level folders (one per user)
  const { data: folders, error: listError } = await admin.storage
    .from(BUCKET.UPLOADS)
    .list("", { limit: 1000 });

  if (listError) {
    throw new Error(`Failed to list upload folders: ${listError.message}`);
  }

  let deletedCount = 0;

  for (const folder of folders ?? []) {
    //no name means it's a folder placeholder
    if (!folder.name) continue;

    const { data: files, error: filesError } = await admin.storage
      .from(BUCKET.UPLOADS)
      .list(folder.name, { limit: 1000 });

    if (filesError || !files) continue;

    const expired = files.filter(
      (f) => f.created_at && f.created_at < cutoff
    );

    if (expired.length > 0) {
      const paths = expired.map((f) => `${folder.name}/${f.name}`);
      const { error: deleteError } = await admin.storage
        .from(BUCKET.UPLOADS)
        .remove(paths);

      if (!deleteError) deletedCount += paths.length;
    }
  }

  return deletedCount;
}

/**overwrites any existing logo for this user*/
export async function uploadLogo(
  userId: string,
  file: File
): Promise<string> {
  const admin = createAdminClient();
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${userId}/logo.${ext}`;

  //remove any existing logo first (might have different extension)
  const { data: existing } = await admin.storage
    .from(BUCKET.LOGOS)
    .list(userId, { limit: 10 });

  if (existing && existing.length > 0) {
    const oldPaths = existing.map((f) => `${userId}/${f.name}`);
    await admin.storage.from(BUCKET.LOGOS).remove(oldPaths);
  }

  const { error } = await admin.storage
    .from(BUCKET.LOGOS)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new Error(`Failed to upload logo: ${error.message}`);
  return path;
}

/**since the logos bucket is public, no signed URL is needed*/
export async function getPublicLogoUrl(
  userId: string
): Promise<string | null> {
  const admin = createAdminClient();

  const { data: files } = await admin.storage
    .from(BUCKET.LOGOS)
    .list(userId, { limit: 1 });

  if (!files || files.length === 0) return null;

  const { data } = admin.storage
    .from(BUCKET.LOGOS)
    .getPublicUrl(`${userId}/${files[0].name}`);

  return data.publicUrl;
}

export async function uploadPreview(
  userId: string,
  file: FileBody,
  reportId: string
): Promise<string> {
  const admin = createAdminClient();
  const path = `${userId}/${reportId}_preview.png`;

  const { error } = await admin.storage
    .from(BUCKET.PREVIEWS)
    .upload(path, file, { contentType: "image/png", upsert: true });

  if (error) throw new Error(`Failed to upload preview: ${error.message}`);
  return path;
}

export function getPublicPreviewUrl(
  userId: string,
  reportId: string
): string {
  const admin = createAdminClient();

  const { data } = admin.storage
    .from(BUCKET.PREVIEWS)
    .getPublicUrl(`${userId}/${reportId}_preview.png`);

  return data.publicUrl;
}
