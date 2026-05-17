import { Prisma, TransactionType } from "@prisma/client";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export function calculateBilledTokens(totalTokens: number, multiplier: number) {
  const amount = Math.ceil(totalTokens * multiplier);
  return Math.max(1, amount);
}

export async function ensureUserHasBalance(userId: string, minimum = 1) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tokenBalance: true, isBanned: true } });

  if (!user) {
    throw new ApiError(401, "invalid_user", "User not found");
  }

  if (user.isBanned) {
    throw new ApiError(403, "user_banned", "User is banned");
  }

  if (user.tokenBalance < BigInt(minimum)) {
    throw new ApiError(402, "insufficient_balance", "Insufficient token balance");
  }
}

export async function debitUserTokens(
  userId: string,
  amount: number,
  reason: string,
  requestLogId?: string,
  metadata?: Record<string, unknown>
) {
  const debitAmount = BigInt(Math.max(0, amount));

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { tokenBalance: true } });
    if (!user) {
      throw new ApiError(401, "invalid_user", "User not found");
    }

    if (user.tokenBalance < debitAmount) {
      throw new ApiError(402, "insufficient_balance", "Insufficient token balance");
    }

    const nextBalance = user.tokenBalance - debitAmount;

    await tx.user.update({
      where: { id: userId },
      data: { tokenBalance: nextBalance }
    });

    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: TransactionType.DEBIT,
        amount: debitAmount,
        balanceBefore: user.tokenBalance,
        balanceAfter: nextBalance,
        reason,
        requestLogId,
        metadata: metadata as Prisma.InputJsonValue | undefined
      }
    });

    return { nextBalance, transaction };
  });
}

export async function creditUserTokens(
  userId: string,
  amount: number,
  reason: string,
  type: TransactionType = TransactionType.CREDIT,
  metadata?: Record<string, unknown>
) {
  const delta = BigInt(amount);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { tokenBalance: true } });
    if (!user) {
      throw new ApiError(401, "invalid_user", "User not found");
    }

    const nextBalance = user.tokenBalance + delta;

    await tx.user.update({ where: { id: userId }, data: { tokenBalance: nextBalance } });

    const transaction = await tx.transaction.create({
      data: {
        userId,
        type,
        amount: delta,
        balanceBefore: user.tokenBalance,
        balanceAfter: nextBalance,
        reason,
        metadata: metadata as Prisma.InputJsonValue | undefined
      }
    });

    return { nextBalance, transaction };
  });
}

