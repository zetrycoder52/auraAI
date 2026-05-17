import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, readRefreshTokenFromCookies, verifyRefreshToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ ok: true });

  try {
    const refreshToken = await readRefreshTokenFromCookies();
    if (refreshToken) {
      const payload = await verifyRefreshToken(refreshToken);
      await prisma.session.updateMany({
        where: { id: payload.sid, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }
  } catch {
    // Ignore invalid token and continue with cookie cleanup.
  }

  clearAuthCookies(response);
  return response;
}

