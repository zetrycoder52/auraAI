import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/errors";
import { parseJsonBody, handleAppError } from "@/lib/route";
import { registerSchema } from "@/lib/validators";
import { hashPassword, setAuthCookies, signAccessToken, signRefreshToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSession, refreshTokenHash } from "@/lib/sessions";
import { env } from "@/lib/env";
import { getIpAddress, getUserAgent } from "@/lib/request";

export async function POST(request: NextRequest) {
  try {
    const payload = await parseJsonBody(request, registerSchema);

    const existing = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
    if (existing) {
      throw new ApiError(409, "email_exists", "User with this email already exists");
    }

    const user = await prisma.user.create({
      data: {
        email: payload.email.toLowerCase(),
        passwordHash: await hashPassword(payload.password),
        tokenBalance: BigInt(env().DEFAULT_NEW_USER_TOKENS),
        settings: {
          create: {
            language: "ru",
            theme: "light"
          }
        }
      }
    });

    const preRefreshToken = await signRefreshToken({ sub: user.id, sid: "pending" });
    const session = await createSession(user.id, preRefreshToken, getIpAddress(request), getUserAgent(request));

    const accessToken = await signAccessToken({ sub: user.id, sid: session.id, role: user.role });
    const refreshToken = await signRefreshToken({ sub: user.id, sid: session.id });

    await prisma.session.update({ where: { id: session.id }, data: { refreshTokenHash: refreshTokenHash(refreshToken) } });

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

