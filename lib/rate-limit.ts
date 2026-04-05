import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _ratelimit: Ratelimit | undefined;

function getRatelimit(): Ratelimit {
  if (_ratelimit) return _ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // In development without Redis configured, return a no-op limiter.
    // In production, this will fail loudly at the Redis client level.
    console.warn(
      "[rate-limit] Upstash Redis not configured — rate limiting is disabled"
    );
    return {
      limit: async () => ({
        success: true,
        limit: 5,
        remaining: 5,
        reset: Date.now() + 600_000,
        pending: Promise.resolve(),
      }),
    } as unknown as Ratelimit;
  }

  const redis = new Redis({ url, token });

  _ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    analytics: false,
    prefix: "secure-dropbox:rl",
  });

  return _ratelimit;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Unix ms timestamp when the window resets
}

/**
 * Check rate limit for the given identifier (typically an IP address).
 * @param identifier  IP address or other unique identifier.
 */
export async function checkRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  const limiter = getRatelimit();
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
