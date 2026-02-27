import { createAdminClient } from "@/lib/supabase/admin";

/**
 *generates a PNG screenshot of the first page.
 *reuses Puppeteer with the same launch args as the PDF renderer.
 */
export async function generatePreviewImage(
  html: string,
  userId: string,
  reportId: string
): Promise<string | null> {
  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123 });
      await page.setContent(html, { waitUntil: "networkidle0" });

      const screenshot = await page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width: 794, height: 1123 },
      });

      const buffer = Buffer.from(screenshot);

      const supabase = createAdminClient();
      const path = `${userId}/${reportId}_preview.png`;

      const { error: uploadError } = await supabase.storage
        .from("previews")
        .upload(path, buffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error("Preview upload failed:", uploadError.message);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from("previews")
        .getPublicUrl(path);

      return urlData.publicUrl;
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("Preview generation failed:", error);
    return null;
  }
}
