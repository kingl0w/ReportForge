import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACCEPTED_EXTENSIONS } from "@/lib/utils/validation";
import { createRateLimiter } from "@/lib/rate-limit";
import { parseFile } from "@/lib/parsers";
import { combineDatasets } from "@/lib/parsers/combiner";
import { getPlanLimits } from "@/lib/stripe/plans";
import type { CombineStrategy, DataSet } from "@/types/data";

const limiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  message: "Upload limit reached (10/hour). Please try again later or upgrade to Pro.",
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const rl = await limiter.checkAsync(user.id);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: rl.message, code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const admin = createAdminClient();
    const { data: userData } = await admin
      .from("User")
      .select("plan")
      .eq("id", user.id)
      .single();

    const planLimits = getPlanLimits(userData?.plan ?? "FREE");

    const formData = await request.formData();
    const combineStrategy = (formData.get("combineStrategy") as CombineStrategy) || "auto";

    //support both "file" (single, backward compat) and "files" (multiple)
    const fileEntries = formData.getAll("files");
    const singleFile = formData.get("file");

    const rawFiles: File[] = [];

    if (fileEntries.length > 0) {
      for (const entry of fileEntries) {
        if (entry instanceof File) rawFiles.push(entry);
      }
    } else if (singleFile instanceof File) {
      rawFiles.push(singleFile);
    }

    if (rawFiles.length === 0) {
      return NextResponse.json(
        { error: "No file provided", code: "MISSING_FILE" },
        { status: 400 }
      );
    }

    if (rawFiles.length > planLimits.maxFilesPerReport) {
      return NextResponse.json(
        {
          error: `Your plan allows ${planLimits.maxFilesPerReport} file${planLimits.maxFilesPerReport === 1 ? "" : "s"} per report. Upgrade for more.`,
          code: "TOO_MANY_FILES",
          limit: planLimits.maxFilesPerReport,
          plan: userData?.plan ?? "FREE",
        },
        { status: 400 }
      );
    }

    const maxFileSize = planLimits.maxFileSize;
    const maxTotalSize = planLimits.maxFileSize * planLimits.maxFilesPerReport;
    const maxFileSizeMB = (maxFileSize / (1024 * 1024)).toFixed(0);
    let totalSize = 0;

    for (const file of rawFiles) {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])) {
        return NextResponse.json(
          {
            error: `Unsupported file type for "${file.name}" (${ext}). Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`,
            code: "INVALID_FILE_TYPE",
          },
          { status: 400 }
        );
      }

      if (file.size > maxFileSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return NextResponse.json(
          {
            error: `"${file.name}" is too large (${sizeMB} MB). Your plan allows up to ${maxFileSizeMB} MB per file.`,
            code: "FILE_TOO_LARGE",
            limit: maxFileSize,
            plan: userData?.plan ?? "FREE",
            upgradeMessage: "Upgrade to Pro for up to 50 MB files.",
          },
          { status: 413 }
        );
      }

      totalSize += file.size;
    }

    if (totalSize > maxTotalSize) {
      const totalMB = (totalSize / (1024 * 1024)).toFixed(1);
      const maxTotalMB = (maxTotalSize / (1024 * 1024)).toFixed(0);
      return NextResponse.json(
        {
          error: `Total upload size (${totalMB} MB) exceeds the ${maxTotalMB} MB limit.`,
          code: "TOTAL_SIZE_TOO_LARGE",
          limit: maxTotalSize,
          plan: userData?.plan ?? "FREE",
        },
        { status: 413 }
      );
    }

    const timestamp = Date.now();
    const fileUrls: string[] = [];
    const parsedDataSets: DataSet[] = [];
    let hasServerParsedFiles = false;

    for (const file of rawFiles) {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      //magic byte validation
      const magicError = validateMagicBytes(ext, buffer);
      if (magicError) {
        return NextResponse.json(
          { error: `${file.name}: ${magicError}`, code: "INVALID_FILE_CONTENT" },
          { status: 400 }
        );
      }

      //upload to Supabase Storage
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${user.id}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error(`Supabase storage upload failed for ${file.name}:`, uploadError);
        return NextResponse.json(
          { error: `Failed to store "${file.name}". Please try again.`, code: "STORAGE_ERROR" },
          { status: 500 }
        );
      }

      const { data: signedData, error: signedError } = await supabase.storage
        .from("uploads")
        .createSignedUrl(storagePath, 3600);

      if (signedError || !signedData?.signedUrl) {
        console.error(`Signed URL generation failed for ${file.name}:`, signedError);
        return NextResponse.json(
          { error: `File "${file.name}" uploaded but URL generation failed.`, code: "SIGNED_URL_ERROR" },
          { status: 500 }
        );
      }

      fileUrls.push(signedData.signedUrl);

      //PDF and DOCX require server-side parsing (can't be parsed client-side)
      const extLower = ext.replace(".", "");
      if (extLower === "pdf" || extLower === "docx") {
        try {
          const dataSet = await parseFile(buffer, file.name, file.size);
          parsedDataSets.push(dataSet);
          hasServerParsedFiles = true;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Parse error";
          console.error(`Server-side parse failed for ${file.name}:`, msg);
          //don't fail the upload — the file is stored, just couldn't parse
          parsedDataSets.push({
            columns: [],
            rows: [],
            rowCount: 0,
            metadata: {
              source: file.name,
              fileSize: file.size,
              fileType: extLower,
              parseWarnings: [`Server-side parsing failed: ${msg}`],
            },
          });
        }
      }
    }

    const response: Record<string, unknown> = {
      fileUrl: fileUrls[0],
      fileUrls,
      storagePath: `${user.id}/${timestamp}_${rawFiles[0].name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      fileName: rawFiles[0].name,
      fileSize: rawFiles[0].size,
      fileCount: rawFiles.length,
      planRowLimit: planLimits.maxRows,
    };

    //include combined dataset for server-parsed files (PDF/DOCX)
    if (hasServerParsedFiles && parsedDataSets.length > 0) {
      const combined =
        parsedDataSets.length === 1
          ? parsedDataSets[0]
          : combineDatasets(parsedDataSets, combineStrategy);
      response.combinedData = combined;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("Upload route error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 *validate file content matches the declared extension using magic bytes.
 *returns an error message if validation fails, null if valid.
 */
function validateMagicBytes(ext: string, buffer: Buffer): string | null {
  if (buffer.length < 4) {
    return "File is empty or too small to be valid.";
  }

  switch (ext) {
    case ".xlsx":
    case ".xlsm": {
      //PK ZIP header (50 4B 03 04)
      if (buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
        return `File content does not match ${ext} format. The file may be corrupted or mislabeled.`;
      }
      break;
    }
    case ".xls": {
      //OLE2 Compound Document header (D0 CF 11 E0)
      if (buffer[0] !== 0xd0 || buffer[1] !== 0xcf || buffer[2] !== 0x11 || buffer[3] !== 0xe0) {
        return "File content does not match .xls format. The file may be corrupted or mislabeled.";
      }
      break;
    }
    case ".json": {
      //JSON must start with { or [
      const firstChar = String.fromCharCode(buffer[0]).trim() || String.fromCharCode(buffer[1]);
      if (firstChar !== "{" && firstChar !== "[") {
        return "File content does not appear to be valid JSON.";
      }
      break;
    }
    case ".pdf": {
      //PDF magic: %PDF
      if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
        return "File content does not match .pdf format. The file may be corrupted or mislabeled.";
      }
      break;
    }
    case ".docx": {
      //DOCX is a ZIP file: PK header (50 4B 03 04)
      if (buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
        return "File content does not match .docx format. The file may be corrupted or mislabeled.";
      }
      break;
    }
    case ".csv":
    case ".tsv":
    case ".txt":
      //text files have no magic bytes — always pass
      break;
  }

  return null;
}
