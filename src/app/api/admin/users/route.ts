import { requireAdmin } from "@/lib/current-user";
import { handleAppError } from "@/lib/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { apiKeys: true, requestLogs: true }
        }
      },
      take: 500
    });

    return Response.json({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        isBanned: user.isBanned,
        banReason: user.banReason,
        tokenBalance: Number(user.tokenBalance),
        bonusTokens: Number(user.bonusTokens),
        createdAt: user.createdAt,
        apiKeysCount: user._count.apiKeys,
        requestsCount: user._count.requestLogs
      }))
    });
  } catch (error) {
    return handleAppError(error);
  }
}

