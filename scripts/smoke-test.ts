#!/usr/bin/env npx tsx
/**Smoke Test Suite for ReportForge
 *
 *runs end-to-end integration tests against a live instance.
 *requires the app to be running and all external services configured.
 *
 *Usage:
 *  npx tsx scripts/smoke-test.ts                          # test localhost:3000
 *  APP_URL=https://reportforge.com npx tsx scripts/smoke-test.ts  # test production
 *
 *Environment:
 *  APP_URL             — Base URL of the running app (default: http://localhost:3000)
 *  SMOKE_TEST_EMAIL    — Email for test user (default: smoke-test-<ts>@test.reportforge.com)
 *  SMOKE_TEST_PASSWORD — Password for test user (REQUIRED, no default)
 *
 *the script creates a test user, runs all tests, then cleans up.
 *exit code 0 = all pass, 1 = any failure.*/

import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY ?? "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} environment variable is required.`);
    process.exit(1);
  }
  return value;
}

const TEST_PASSWORD = requireEnv("SMOKE_TEST_PASSWORD");
const ts = Date.now();
const TEST_EMAIL =
  process.env.SMOKE_TEST_EMAIL ?? `smoke-test-${ts}@test.reportforge.com`;

let testUserId = "";
let authCookieHeader = "";
let reportId = "";
let uploadedFileUrl = "";

function getAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface TestResult {
  name: string;
  passed: boolean;
  skipped?: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  const start = performance.now();
  try {
    await fn();
    results.push({
      name,
      passed: true,
      durationMs: Math.round(performance.now() - start),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isSkip = message.includes("not set") && message.includes("skipping");
    results.push({
      name,
      passed: isSkip,
      skipped: isSkip,
      durationMs: Math.round(performance.now() - start),
      error: message,
    });
  }
}

/**@supabase/ssr stores the session in chunked cookies named
 *`sb-{projectRef}-auth-token.{n}`. Each chunk is max 3180 chars.
 *the middleware checks for cookies containing "sb-" to gate auth.*/
function buildAuthCookies(session: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: unknown;
}): string {
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  const cookieName = `sb-${ref}-auth-token`;
  const sessionJson = JSON.stringify(session);

  //must match @supabase/ssr chunk size
  const CHUNK_SIZE = 3180;
  const chunks: string[] = [];
  for (let i = 0; i < sessionJson.length; i += CHUNK_SIZE) {
    chunks.push(sessionJson.slice(i, i + CHUNK_SIZE));
  }

  if (chunks.length === 1) {
    return `${cookieName}=${encodeURIComponent(chunks[0])}`;
  }

  return chunks
    .map((chunk, i) => `${cookieName}.${i}=${encodeURIComponent(chunk)}`)
    .join("; ");
}

/**authenticated request using test user's session.
 *sends Supabase auth cookies and Origin header to satisfy middleware.*/
async function appFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${APP_URL}${path}`;
  const headers = new Headers(init?.headers);

  if (authCookieHeader) {
    headers.set("Cookie", authCookieHeader);
  }

  if (!headers.has("Origin")) {
    headers.set("Origin", APP_URL);
  }

  return fetch(url, { ...init, headers, redirect: "manual" });
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

/**test 1: health endpoint returns 200 with service statuses*/
async function testHealth() {
  const res = await fetch(`${APP_URL}/api/health`);
  assert(res.ok, `Health returned ${res.status}`);

  const body = await res.json();
  assert(
    body.status === "healthy" || body.status === "degraded",
    `Health status: ${body.status}`
  );
  assert(typeof body.version === "string", "Missing version");
  assert(typeof body.uptime === "number", "Missing uptime");
  assert(body.services?.database !== undefined, "Missing database check");
  assert(body.services?.redis !== undefined, "Missing redis check");
  assert(body.services?.storage !== undefined, "Missing storage check");
  assert(body.services?.stripe !== undefined, "Missing stripe check");
}

/**test 2: landing page renders*/
async function testLandingPage() {
  const res = await fetch(APP_URL);
  assert(res.ok, `Landing page returned ${res.status}`);

  const html = await res.text();
  assert(html.includes("ReportForge"), "Landing page missing ReportForge text");
  assert(html.includes("</html>"), "Landing page HTML is incomplete");
}

/**test 3: auth flow — sign up, verify session*/
async function testAuth() {
  const admin = getAdmin();

  //skips email verification via admin API
  const { data: authData, error: signUpError } =
    await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

  if (signUpError) throw new Error(`Signup failed: ${signUpError.message}`);
  assert(!!authData.user, "No user returned from signup");
  testUserId = authData.user.id;

  //Supabase auth != app User table, so create the app-level row too
  await admin.from("User").upsert({
    id: testUserId,
    email: TEST_EMAIL,
    name: "Smoke Test",
    plan: "FREE",
    reportsUsed: 0,
    reportsLimit: 3,
    updatedAt: new Date().toISOString(),
  });

  const anonClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: signInData, error: passwordError } =
    await anonClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

  if (passwordError) throw new Error(`Password sign-in failed: ${passwordError.message}`);
  assert(!!signInData.session, "No session returned");

  authCookieHeader = buildAuthCookies(signInData.session);

  const res = await appFetch("/api/subscription");
  assert(res.ok, `Subscription check returned ${res.status}: ${await res.text()}`);
}

/**test 4: file upload — upload a small CSV*/
async function testFileUpload() {
  const csvContent =
    "date,product,revenue,units\n" +
    "2026-01-01,Widget A,1500,30\n" +
    "2026-01-02,Widget A,1800,36\n" +
    "2026-01-03,Widget B,900,15\n" +
    "2026-01-04,Widget A,2100,42\n" +
    "2026-01-05,Widget B,1200,20\n";

  const blob = new Blob([csvContent], { type: "text/csv" });
  const formData = new FormData();
  formData.append("file", blob, "test-sales.csv");

  const res = await appFetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  assert(res.ok, `Upload returned ${res.status}: ${await res.clone().text()}`);

  const body = await res.json();
  assert(!!body.fileUrl || !!body.storagePath, "No file URL or storage path in upload response");
  uploadedFileUrl = body.fileUrl ?? body.storagePath;
}

/**test 5: report generation — trigger report, wait for completion*/
async function testReportGeneration() {
  const res = await appFetch("/api/reports/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Smoke Test Report",
      rawDataUrl: uploadedFileUrl,
      fileName: "test-sales.csv",
      format: "pdf",
    }),
  });

  assert(res.ok, `Generate returned ${res.status}: ${await res.clone().text()}`);

  const body = await res.json();
  assert(!!body.reportId, "No reportId in generate response");
  reportId = body.reportId;

  const deadline = Date.now() + 60_000;
  let status = body.status ?? "QUEUED";

  while (Date.now() < deadline && !["COMPLETE", "FAILED"].includes(status)) {
    await new Promise((r) => setTimeout(r, 2000));

    const pollRes = await appFetch(`/api/reports/${reportId}`);
    if (!pollRes.ok) continue;

    const pollBody = await pollRes.json();
    status = pollBody.status;
  }

  assert(status === "COMPLETE", `Report status: ${status} (expected COMPLETE)`);
}

/**test 6: PDF download — verify the generated report is accessible*/
async function testPdfDownload() {
  assert(!!reportId, "No reportId from previous test");

  const res = await appFetch(`/api/reports/${reportId}/download`);
  assert(res.ok, `Download returned ${res.status}: ${await res.clone().text()}`);

  const body = await res.json();
  assert(!!body.downloadUrl, "No downloadUrl in response");

  const pdfRes = await fetch(body.downloadUrl);
  assert(pdfRes.ok, `PDF fetch returned ${pdfRes.status}`);

  const contentType = pdfRes.headers.get("content-type") ?? "";
  assert(
    contentType.includes("pdf") || contentType.includes("octet-stream"),
    `Unexpected content-type: ${contentType}`
  );

  const pdfBuffer = await pdfRes.arrayBuffer();
  assert(pdfBuffer.byteLength > 100, `PDF too small (${pdfBuffer.byteLength} bytes)`);

  //PDF magic bytes (%PDF-)
  const header = new Uint8Array(pdfBuffer.slice(0, 5));
  const magic = String.fromCharCode(...header);
  assert(magic === "%PDF-", `Invalid PDF header: ${magic}`);
}

/**test 7: Stripe checkout — create session, verify redirect URL*/
async function testStripeCheckout() {
  if (!STRIPE_SECRET) {
    throw new Error("STRIPE_SECRET_KEY not set — skipping");
  }

  const res = await appFetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId: "PRO" }),
  });

  assert(res.ok, `Checkout returned ${res.status}: ${await res.clone().text()}`);

  const body = await res.json();
  assert(!!body.url, "No checkout URL returned");
  assert(
    body.url.includes("checkout.stripe.com"),
    `Checkout URL is not Stripe: ${body.url}`
  );
}

/**test 8: webhook — send a mock event, verify 200 response*/
async function testWebhook() {
  if (!STRIPE_SECRET || !STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set — skipping");
  }

  const event = {
    id: `evt_smoke_${ts}`,
    object: "event",
    api_version: "2026-01-28.clover",
    created: Math.floor(Date.now() / 1000),
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_smoke_${ts}`,
        object: "checkout.session",
        mode: "payment",
        metadata: {
          userId: testUserId,
          planId: "PER_REPORT",
        },
        customer: `cus_smoke_${ts}`,
        subscription: null,
        payment_intent: `pi_smoke_${ts}`,
      },
    },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  };

  const payload = JSON.stringify(event);

  //replicate Stripe's signing algorithm
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac("sha256", STRIPE_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest("hex");

  const stripeSignature = `t=${timestamp},v1=${signature}`;

  const res = await fetch(`${APP_URL}/api/webhooks/stripe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": stripeSignature,
    },
    body: payload,
  });

  assert(res.ok, `Webhook returned ${res.status}: ${await res.clone().text()}`);

  const body = await res.json();
  assert(body.received === true, `Webhook response: ${JSON.stringify(body)}`);
}

/**test 9: email — verify Resend can accept a send request*/
async function testEmail() {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not set — skipping");
  }

  //hit Resend API directly to avoid needing app auth
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "ReportForge <onboarding@resend.dev>",
      to: "delivered@resend.dev",
      subject: `Smoke Test — ${new Date().toISOString()}`,
      text: "This is an automated smoke test email from ReportForge. If you see this, Resend is working.",
    }),
  });

  assert(res.ok, `Resend API returned ${res.status}: ${await res.clone().text()}`);

  const body = await res.json();
  assert(!!body.id, "No email ID in Resend response");
}

async function cleanup() {
  if (!testUserId) return;

  try {
    const admin = getAdmin();

    await admin.from("Report").delete().eq("userId", testUserId);
    await admin.from("Subscription").delete().eq("userId", testUserId);

    const { data: events } = await admin
      .from("StripeEvent")
      .select("id, stripeEventId")
      .like("stripeEventId", `evt_smoke_%`);
    if (events?.length) {
      await admin
        .from("StripeEvent")
        .delete()
        .in("id", events.map((e) => e.id));
    }

    await admin.from("UserSettings").delete().eq("userId", testUserId);
    await admin.from("User").delete().eq("id", testUserId);
    await admin.auth.admin.deleteUser(testUserId);

    const buckets = ["uploads", "reports", "previews"];
    for (const bucket of buckets) {
      const { data: files } = await admin.storage
        .from(bucket)
        .list(testUserId);
      if (files?.length) {
        await admin.storage
          .from(bucket)
          .remove(files.map((f) => `${testUserId}/${f.name}`));
      }
    }
  } catch (err) {
    console.error("Cleanup error (non-fatal):", err);
  }
}

async function main() {
  console.log(`\nReportForge Smoke Tests`);
  console.log(`Target: ${APP_URL}`);
  console.log(`Test user: ${TEST_EMAIL}\n`);

  //tests run in order — some depend on prior state
  await runTest("1. Health endpoint", testHealth);
  await runTest("2. Landing page", testLandingPage);
  await runTest("3. Auth flow", testAuth);
  await runTest("4. File upload", testFileUpload);
  await runTest("5. Report generation", testReportGeneration);
  await runTest("6. PDF download", testPdfDownload);
  await runTest("7. Stripe checkout", testStripeCheckout);
  await runTest("8. Webhook", testWebhook);
  await runTest("9. Email (Resend)", testEmail);

  console.log("\nCleaning up test data...");
  await cleanup();

  console.log("\n" + "=".repeat(72));
  console.log(
    " #  " +
      "Test".padEnd(30) +
      "Result".padEnd(10) +
      "Time".padEnd(10) +
      "Error"
  );
  console.log("-".repeat(72));

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const r of results) {
    const icon = r.skipped ? "SKIP" : r.passed ? "PASS" : "FAIL";
    const time = `${r.durationMs}ms`;
    const error = r.error ? r.error.slice(0, 40) : "";
    console.log(
      ` ${r.name.padEnd(33)}${icon.padEnd(10)}${time.padEnd(10)}${error}`
    );
    if (r.skipped) skipped++;
    else if (r.passed) passed++;
    else failed++;
  }

  console.log("=".repeat(72));
  console.log(`\nTotal: ${results.length}  Passed: ${passed}  Skipped: ${skipped}  Failed: ${failed}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  cleanup().finally(() => process.exit(1));
});
