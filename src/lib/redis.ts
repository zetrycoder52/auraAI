import Redis from "ioredis";
import { env } from "@/lib/env";

let redisClient: Redis | null = null;

export function getRedis() {
  const redisUrl = env().REDIS_URL;

  if (!redisUrl) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
      lazyConnect: true
    });

    redisClient.on("error", (error) => {
      console.error("Redis error", error);
    });
  }

  return redisClient;
}

