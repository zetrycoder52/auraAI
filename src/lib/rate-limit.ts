import RateLimiterMemory from "rate-limiter-flexible/lib/RateLimiterMemory";
import RateLimiterRedis from "rate-limiter-flexible/lib/RateLimiterRedis";
import { env } from "@/lib/env";
import { getRedis } from "@/lib/redis";

type Limiter = RateLimiterMemory | RateLimiterRedis;
let limiter: Limiter | null = null;

function getLimiter() {
  if (limiter) {
    return limiter;
  }

  const redis = getRedis();

  limiter = redis
    ? new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: "aura_rl",
        points: env().REQUEST_LIMIT_PER_MINUTE,
        duration: 60
      })
    : new RateLimiterMemory({
        points: env().REQUEST_LIMIT_PER_MINUTE,
        duration: 60
      });

  return limiter;
}

export async function applyRateLimit(key: string) {
  try {
    await getLimiter().consume(key);
  } catch {
    return false;
  }

  return true;
}

