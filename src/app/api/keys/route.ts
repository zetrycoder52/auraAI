import { NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { createApiKey } from "@/lib/api-keys";
import { prisma } from "@/lib/prisma";
import { handleAppError, parseJsonBody } from "@/lib/route";
import { createApiKeySchema } from "@/lib/validators";

export async function GET() {
  try {
    const user = await requireCurrentUser();

    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    });

    return Response.json({
      keys: keys.map((key) => ({
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        maskedKey: `${key.prefix}****${key.last4}`,
        status: key.status,
        allowedIps: key.allowedIps,
        maxRequestsPerDay: key.maxRequestsPerDay,
        maxTokensPerDay: key.maxTokensPerDay,
        expiresAt: key.expiresAt,
        revokedAt: key.revokedAt,
        lastUsedAt: key.lastUsedAt,
        totalRequests: key.totalRequests,
        totalTokens: Number(key.totalTokens),
        createdAt: key.createdAt
      }))
    });
  } catch (error) {
    return handleAppError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const payload = await parseJsonBody(request, createApiKeySchema);

    const created = await createApiKey(user.id, payload.name, {
      allowedIps: payload.allowedIps,
      maxRequestsPerDay: payload.maxRequestsPerDay,
      maxTokensPerDay: payload.maxTokensPerDay,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined
    });

    return Response.json({
      key: {
        id: created.apiKey.id,
        name: created.apiKey.name,
        status: created.apiKey.status,
        createdAt: created.apiKey.createdAt,
        expiresAt: created.apiKey.expiresAt
      },
      rawKey: created.rawKey,
      warning: "Сохраните ключ сейчас. В открытом виде он больше не показывается."
    });
  } catch (error) {
    return handleAppError(error);
  }
}
