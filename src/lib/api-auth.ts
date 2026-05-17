import { endOfDay, startOfDay } from "date-fns";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { parseBearerApiKey, resolveApiKey, assertApiKeyAllowed } from "@/lib/api-keys";
import { applyRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getIpAddress } from "@/lib/request";

export async function authenticateApiKey(request: NextRequest) {
  const rawAuthorization = request.headers.get("authorization");
  const explicitApiKey = request.headers.get("x-api-key");
  const rawKey = parseBearerApiKey(rawAuthorization) ?? explicitApiKey?.trim() ?? null;

  if (!rawKey) {
    throw new ApiError(401, "invalid_api_key", "Missing API key");
  }

  const ipAddress = getIpAddress(request);
  const allowed = await applyRateLimit(`${rawKey}:${ipAddress}`);
  if (!allowed) {
    throw new ApiError(429, "rate_limit_exceeded", "Rate limit exceeded");
  }

  const apiKey = await resolveApiKey(rawKey);
  assertApiKeyAllowed(apiKey, ipAddress);

  await enforceApiKeyLimits(apiKey.id);

  return {
    rawKey,
    apiKey,
    user: apiKey.user,
    ipAddress
  };
}

async function enforceApiKeyLimits(apiKeyId: string) {
  const apiKey = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!apiKey) {
    throw new ApiError(401, "invalid_api_key", "API key not found");
  }

  const from = startOfDay(new Date());
  const to = endOfDay(new Date());

  if (apiKey.maxRequestsPerDay) {
    const requestCount = await prisma.requestLog.count({
      where: {
        apiKeyId,
        createdAt: { gte: from, lte: to }
      }
    });

    if (requestCount >= apiKey.maxRequestsPerDay) {
      throw new ApiError(429, "daily_limit_exceeded", "Daily request limit reached");
    }
  }

  if (apiKey.maxTokensPerDay) {
    const aggregate = await prisma.requestLog.aggregate({
      where: {
        apiKeyId,
        createdAt: { gte: from, lte: to }
      },
      _sum: {
        totalTokens: true
      }
    });

    if ((aggregate._sum.totalTokens ?? 0) >= apiKey.maxTokensPerDay) {
      throw new ApiError(429, "daily_token_limit_exceeded", "Daily token limit reached");
    }
  }
}

