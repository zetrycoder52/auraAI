import { NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { handleAppError } from "@/lib/route";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { createApiKey } from "@/lib/api-keys";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: Context) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;

    const oldKey = await prisma.apiKey.findFirst({ where: { id, userId: user.id } });
    if (!oldKey) {
      throw new ApiError(404, "not_found", "API key not found");
    }

    await prisma.apiKey.update({
      where: { id: oldKey.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date()
      }
    });

    const created = await createApiKey(user.id, oldKey.name, {
      allowedIps: oldKey.allowedIps ?? undefined,
      maxRequestsPerDay: oldKey.maxRequestsPerDay ?? undefined,
      maxTokensPerDay: oldKey.maxTokensPerDay ?? undefined,
      expiresAt: oldKey.expiresAt ?? undefined
    });

    return Response.json({
      key: {
        id: created.apiKey.id,
        name: created.apiKey.name,
        status: created.apiKey.status
      },
      rawKey: created.rawKey,
      warning: "Старый ключ отозван. Новый показан только один раз."
    });
  } catch (error) {
    return handleAppError(error);
  }
}

