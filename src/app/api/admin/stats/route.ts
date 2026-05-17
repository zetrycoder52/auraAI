import { subDays } from "date-fns";
import { requireAdmin } from "@/lib/current-user";
import { handleAppError } from "@/lib/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const weekAgo = subDays(new Date(), 7);

    const [usersCount, activeKeys, logsCount, errorCount, revenueAgg, providerGroups] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.apiKey.count({ where: { status: "ACTIVE" } }),
      prisma.requestLog.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.requestLog.count({ where: { createdAt: { gte: weekAgo }, success: false } }),
      prisma.transaction.aggregate({
        where: { type: "DEBIT" },
        _sum: { amount: true }
      }),
      prisma.requestLog.groupBy({
        by: ["provider"],
        _sum: {
          totalTokens: true,
          billedTokens: true
        }
      })
    ]);

    const providerExpenses = providerGroups.map((group) => ({
      provider: group.provider,
      totalTokens: group._sum.totalTokens ?? 0,
      billedTokens: Number(group._sum.billedTokens ?? BigInt(0)),
      estimatedCostUsd: Number((((group._sum.totalTokens ?? 0) / 1_000_000) * 3).toFixed(4))
    }));

    return Response.json({
      stats: {
        usersCount,
        activeKeys,
        requestsLast7d: logsCount,
        errorsLast7d: errorCount,
        revenueTokens: Number(revenueAgg._sum.amount ?? BigInt(0))
      },
      providerExpenses
    });
  } catch (error) {
    return handleAppError(error);
  }
}

