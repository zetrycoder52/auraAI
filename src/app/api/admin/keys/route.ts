import { requireAdmin } from "@/lib/current-user";
import { handleAppError } from "@/lib/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } }
      },
      take: 500
    });

    return Response.json({
      keys: keys.map((key) => ({
        id: key.id,
        userEmail: key.user.email,
        name: key.name,
        maskedKey: `${key.prefix}****${key.last4}`,
        status: key.status,
        totalRequests: key.totalRequests,
        totalTokens: Number(key.totalTokens),
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt
      }))
    });
  } catch (error) {
    return handleAppError(error);
  }
}

