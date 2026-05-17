import type { ApiKey, Prisma, User } from "@prisma/client";
import { ApiKeyStatus } from "@prisma/client";
import { secureRandom, sha256 } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";

export type ApiKeyWithUser = ApiKey & { user: User };

export function generateApiKeyValue() {
  return `aura_live_${secureRandom(24)}`;
}

export function apiKeyHash(rawKey: string) {
  return sha256(rawKey);
}

export function parseBearerApiKey(value: string | null) {
  if (!value) return null;
  if (value.startsWith("Bearer ")) {
    return value.slice(7).trim();
  }
  return value.trim();
}

export function keyPublicMeta(rawKey: string) {
  return {
    prefix: rawKey.slice(0, 14),
    last4: rawKey.slice(-4)
  };
}

export async function createApiKey(userId: string, name: string, options?: Partial<Prisma.ApiKeyCreateInput>) {
  const rawKey = generateApiKeyValue();
  const { prefix, last4 } = keyPublicMeta(rawKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      user: { connect: { id: userId } },
      name,
      prefix,
      last4,
      keyHash: apiKeyHash(rawKey),
      status: ApiKeyStatus.ACTIVE,
      allowedIps: options?.allowedIps,
      maxRequestsPerDay: options?.maxRequestsPerDay as number | undefined,
      maxTokensPerDay: options?.maxTokensPerDay as number | undefined,
      expiresAt: options?.expiresAt as Date | undefined
    }
  });

  return { apiKey, rawKey };
}

export function assertApiKeyAllowed(apiKey: ApiKeyWithUser, ipAddress?: string | null) {
  if (apiKey.status !== ApiKeyStatus.ACTIVE) {
    throw new ApiError(401, "invalid_api_key", "API key revoked or inactive");
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new ApiError(401, "invalid_api_key", "API key expired");
  }

  if (apiKey.user.isBanned) {
    throw new ApiError(403, "user_banned", "User is banned");
  }

  const allowedIps = Array.isArray(apiKey.allowedIps) ? (apiKey.allowedIps as string[]) : null;
  if (allowedIps && allowedIps.length > 0 && ipAddress && !allowedIps.includes(ipAddress)) {
    throw new ApiError(403, "forbidden_ip", "IP address is not allowed for this key");
  }
}

export async function resolveApiKey(rawKey: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: apiKeyHash(rawKey) },
    include: { user: true }
  });

  if (!apiKey) {
    throw new ApiError(401, "invalid_api_key", "Incorrect API key provided");
  }

  return apiKey;
}

export async function touchApiKeyUsage(apiKeyId: string, tokens: number) {
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: {
      lastUsedAt: new Date(),
      totalRequests: { increment: 1 },
      totalTokens: { increment: BigInt(tokens) }
    }
  });
}

