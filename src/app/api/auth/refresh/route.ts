import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/errors";
import { clearAuthCookies, readRefreshTokenFromCookies, setAuthCookies, signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth";
import { handleAppError } from "@/lib/route";
import { findActiveSession, refreshTokenHash } from "@/lib/sessions";
import { prisma } from "@/lib/prisma";

export async function POST(_request: NextRequest) {
  try {
    const refreshToken = await readRefreshTokenFromCookies();
    if (!refreshToken) {
      throw new ApiError(401, "invalid_session", "Missing refresh token");
    }

    const payload = await verifyRefreshToken(refreshToken);
    const session = await findActiveSession(payload.sid, refreshToken);

    if (!session) {
      throw new ApiError(401, "invalid_session", "Session expired or revoked");
    }

    if (session.user.isBanned) {
      throw new ApiError(403, "user_banned", "User is banned");
    }

    const accessToken = await signAccessToken({ sub: session.user.id, role: session.user.role, sid: session.id });
    const rotatedRefreshToken = await signRefreshToken({ sub: session.user.id, sid: session.id });

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: refreshTokenHash(rotatedRefreshToken) }
    });

    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, accessToken, rotatedRefreshToken);
    return response;
  } catch (error) {
    const response = handleAppError(error) as NextResponse;
    clearAuthCookies(response);
    return response;
  }
}

