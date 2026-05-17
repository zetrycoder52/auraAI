import { NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { handleAppError, parseJsonBody } from "@/lib/route";
import { updateApiKeySchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";

type Context = {
  params: Promise<{ id: string }>;
};

async function getOwnedKey(userId: string, id: string) {
  const key = await prisma.apiKey.findFirst({ where: { id, userId } });
  if (!key) {
    throw new ApiError(404, "not_found", "API key not found");
  }

  return key;
}

export async function GET(_request: NextRequest, context: Context) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const key = await getOwnedKey(user.id, id);

    return Response.json({
      key: {
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
      }
    });
  } catch (error) {
    return handleAppError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    await getOwnedKey(user.id, id);
    const payload = await parseJsonBody(request, updateApiKeySchema);

    const key = await prisma.apiKey.update({
      where: { id },
      data: {
        name: payload.name,
        allowedIps: payload.allowedIps,
        maxRequestsPerDay: payload.maxRequestsPerDay === undefined ? undefined : payload.maxRequestsPerDay,
        maxTokensPerDay: payload.maxTokensPerDay === undefined ? undefined : payload.maxTokensPerDay,
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : payload.expiresAt === null ? null : undefined,
        status: payload.status,
        revokedAt: payload.status === "REVOKED" ? new Date() : payload.status === "ACTIVE" ? null : undefined
      }
    });

    return Response.json({
      key: {
        id: key.id,
        name: key.name,
        status: key.status,
        updatedAt: key.updatedAt
      }
    });
  } catch (error) {
    return handleAppError(error);
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    await getOwnedKey(user.id, id);

    await prisma.apiKey.update({
      where: { id },
      data: {
        status: "REVOKED",
        revokedAt: new Date()
      }
    });

    return Response.json({ ok: true });
  } catch (error) {
    return handleAppError(error);
  }
}

