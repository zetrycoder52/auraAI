import { requireCurrentUser } from "@/lib/current-user";
import { handleAppError } from "@/lib/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireCurrentUser();

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    return Response.json({
      transactions: transactions.map((item) => ({
        id: item.id,
        type: item.type,
        amount: Number(item.amount),
        balanceBefore: Number(item.balanceBefore),
        balanceAfter: Number(item.balanceAfter),
        reason: item.reason,
        createdAt: item.createdAt,
        metadata: item.metadata
      }))
    });
  } catch (error) {
    return handleAppError(error);
  }
}

