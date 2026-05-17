import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/errors";
import { parseJsonBody, handleAppError } from "@/lib/route";
import { loginSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setAuthCookies, signAccessToken, signRefreshToken } from "@/lib/auth";
import { createSession, refreshTokenHash } from "@/lib/sessions";
import { getIpAddress, getUserAgent } from "@/lib/request";

export async function POST(request: NextRequest) {
  try {
    const payload = await parseJsonBody(request, loginSchema);

    const user = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
    if (!user) {
      throw new ApiError(401, "invalid_credentials", "Invalid email or password");
    }

    if (user.isBanned) {
      throw new ApiError(403, "user_banned", "User is banned");
    }

    const ok = await verifyPassword(payload.password, user.passwordHash);
    if (!ok) {
      throw new ApiError(401, "invalid_credentials", "Invalid email or password");
    }

    const preRefresh = await signRefreshToken({ sub: user.id, sid: "pending" });
    const session = await createSession(user.id, preRefresh, getIpAddress(request), getUserAgent(request));

    const accessToken = await signAccessToken({ sub: user.id, role: user.role, sid: session.id });
    const refreshToken = await signRefreshToken({ sub: user.id, sid: session.id });

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: refreshTokenHash(refreshToken)
      }
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tokenBalance: Number(user.tokenBalance)
      }
    });

    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    return handleAppError(error);
  }
}

