import { NextResponse } from "next/server";

const startTime = Date.now();
const version = process.env.npm_package_version ?? "0.1.0";

interface ServiceCheck {
  status: "pass" | "fail";
  latencyMs: number;
  message?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  uptime: number;
  timestamp: string;
  services: Record<string, ServiceCheck>;
}

/*check a service with a timeout. returns pass/fail without leaking details.*/
async function checkService(
  name: string,
  fn: () => Promise<void>,
  timeoutMs = 5000
): Promise<ServiceCheck> {
  const start = performance.now();
  try {
    await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs)
      ),
    ]);
    return { status: "pass", latencyMs: Math.round(performance.now() - start) };
  } catch (err: unknown) {
    const message =
      process.env.NODE_ENV === "production"
        ? undefined
        : err instanceof Error
          ? err.message
          : "unknown error";
    return {
      status: "fail",
      latencyMs: Math.round(performance.now() - start),
      message,
    };
  }
}

async function checkDatabase(): Promise<void> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { error } = await admin.from("User").select("id").limit(1);
  if (error) throw new Error(error.message);
}

async function checkRedis(): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("not configured");
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis({ url, token });
  const pong = await redis.ping();
  if (pong !== "PONG") throw new Error(`unexpected response: ${pong}`);
}

async function checkStorage(): Promise<void> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { error } = await admin.storage.listBuckets();
  if (error) throw new Error(error.message);
}

async function checkStripe(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("not configured");
  const { getStripe } = await import("@/lib/stripe/client");
  const stripe = getStripe();
  await stripe.balance.retrieve();
}

/*critical services — if any fail, overall status is "unhealthy".*/
const CRITICAL = new Set(["database"]);

export async function GET() {
  const [database, redis, storage, stripe] = await Promise.all([
    checkService("database", checkDatabase),
    checkService("redis", checkRedis),
    checkService("storage", checkStorage),
    checkService("stripe", checkStripe),
  ]);

  const services: Record<string, ServiceCheck> = {
    database,
    redis,
    storage,
    stripe,
  };

  const allPass = Object.values(services).every((s) => s.status === "pass");
  const criticalFail = Object.entries(services).some(
    ([name, s]) => CRITICAL.has(name) && s.status === "fail"
  );

  let status: HealthResponse["status"];
  if (allPass) {
    status = "healthy";
  } else if (criticalFail) {
    status = "unhealthy";
  } else {
    status = "degraded";
  }

  const body: HealthResponse = {
    status,
    version,
    uptime: Math.round((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    services,
  };

  const httpStatus = status === "unhealthy" ? 503 : 200;

  return NextResponse.json(body, { status: httpStatus });
}
