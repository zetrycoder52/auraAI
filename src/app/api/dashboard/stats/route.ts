import { subDays, startOfDay } from "date-fns";
import { requireCurrentUser } from "@/lib/current-user";
import { handleAppError } from "@/lib/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireCurrentUser();

    const from = subDays(new Date(), 6);

    const [logs, key, spentAggregate] = await Promise.all([
      prisma.requestLog.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: startOfDay(from) }
        },
        select: {
          createdAt: true,
          totalTokens: true,
          billedTokens: true
        },
        orderBy: { createdAt: "asc" }
      }),
      prisma.apiKey.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
        orderBy: { createdAt: "asc" }
      }),
      prisma.requestLog.aggregate({
        where: { userId: user.id },
        _sum: {
          billedTokens: true
        }
      })
    ]);

    const dailyMap = new Map<string, number>();
    for (let i = 0; i < 7; i += 1) {
      const day = startOfDay(subDays(new Date(), 6 - i));
      dailyMap.set(day.toISOString().slice(0, 10), 0);
    }

    for (const log of logs) {
      const keyDay = startOfDay(log.createdAt).toISOString().slice(0, 10);
      dailyMap.set(keyDay, (dailyMap.get(keyDay) ?? 0) + log.totalTokens);
    }

    const totalRequests7d = logs.length;
    const totalTokens7d = logs.reduce((acc, item) => acc + item.totalTokens, 0);
    const billedTokensLifetime = Number(spentAggregate._sum.billedTokens ?? BigInt(0));

    // Approximation metric: what this volume would cost on direct OpenAI usage.
    const estimatedOpenAIDollar = Number((billedTokensLifetime / 1_000_000 * 5).toFixed(4));

    return Response.json({
      stats: {
        tokenBalance: Number(user.tokenBalance),
        totalRequests7d,
        totalTokens7d,
        estimatedOpenAIDollar,
        apiKey: key
          ? {
              id: key.id,
              name: key.name,
              maskedKey: `${key.prefix}****${key.last4}`,
              lastUsedAt: key.lastUsedAt
            }
          : null
      },
      graph: Array.from(dailyMap.entries()).map(([date, tokens]) => ({ date, tokens }))
    });
  } catch (error) {
    return handleAppError(error);
  }
}

