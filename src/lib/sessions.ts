import { sha256 } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export function refreshTokenHash(token: string) {
  return sha256(token);
}

export async function createSession(userId: string, refreshToken: string, ipAddress?: string, userAgent?: string) {
  return prisma.session.create({
    data: {
      userId,
      refreshTokenHash: refreshTokenHash(refreshToken),
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + env().JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000)
    }
  });
}

export async function revokeSession(sessionId: string) {
  return prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() }
  });
}

export async function findActiveSession(sessionId: string, refreshToken: string) {
  return prisma.session.findFirst({
    where: {
      id: sessionId,
      refreshTokenHash: refreshTokenHash(refreshToken),
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  });
}

export async function revokeAllUserSessions(userId: string) {
  return prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

