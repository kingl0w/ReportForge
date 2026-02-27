import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  /**Redis key prefix to namespace different limiters*/
  prefix?: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  message: string;
}

const DEFAULT_MESSAGE = "Too many requests. Please try again later.";

/**falls back to in-memory (non-production only) when Redis is not configured.*/
const hasRedis = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

let redisInstance: Redis | null = null;

function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisInstance;
}

/**Upstash Redis in production, in-memory fallback for local dev.*/
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = DEFAULT_MESSAGE,
    prefix = "rl",
  } = config;

  if (hasRedis) {
    const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
    const ratelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSec} s`),
      prefix,
      analytics: false,
    });

    async function checkAsync(key: string): Promise<RateLimitResult> {
      const result = await ratelimit.limit(key);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
        message: result.success ? "" : message,
      };
    }

    return { check: checkAsync, checkAsync };
  }

  //in-memory fallback -- only works for single-process dev server
  const store = new Map<string, { count: number; resetAt: number }>();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 60_000);

  if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }

  function check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
        message: "",
      };
    }

    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        message,
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetAt,
      message: "",
    };
  }

  async function checkAsync(key: string): Promise<RateLimitResult> {
    return check(key);
  }

  return { check, checkAsync };
}
