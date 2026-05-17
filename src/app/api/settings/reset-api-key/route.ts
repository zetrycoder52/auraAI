import { requireCurrentUser } from "@/lib/current-user";
import { handleAppError } from "@/lib/route";
import { prisma } from "@/lib/prisma";
import { createApiKey } from "@/lib/api-keys";

export async function POST() {
  try {
    const user = await requireCurrentUser();

    await prisma.apiKey.updateMany({
      where: {
        userId: user.id,
        status: "ACTIVE"
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date()
      }
    });

    const created = await createApiKey(user.id, "Primary key");

    return Response.json({
      key: {
        id: created.apiKey.id,
        name: created.apiKey.name,
        status: created.apiKey.status
      },
      rawKey: created.rawKey,
      message: "Все активные ключи сброшены. Текущая сессия сохранена."
    });
  } catch (error) {
    return handleAppError(error);
  }
}

