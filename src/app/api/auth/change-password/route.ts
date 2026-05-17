import { NextRequest } from "next/server";
import { handleAppError, parseJsonBody } from "@/lib/route";
import { changePasswordSchema } from "@/lib/validators";
import { requireCurrentUser } from "@/lib/current-user";
import { hashPassword, readAccessTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const payload = await parseJsonBody(request, changePasswordSchema);

    const isCorrect = await verifyPassword(payload.currentPassword, user.passwordHash);
    if (!isCorrect) {
      throw new ApiError(400, "invalid_password", "Current password is incorrect");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(payload.newPassword)
      }
    });

    const accessToken = await readAccessTokenFromCookies();
    let currentSessionId: string | null = null;

    if (accessToken) {
      try {
        currentSessionId = (await verifyAccessToken(accessToken)).sid;
      } catch {
        currentSessionId = null;
      }
    }

    await prisma.session.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
        ...(currentSessionId ? { id: { not: currentSessionId } } : {})
      },
      data: {
        revokedAt: new Date()
      }
    });

    return Response.json({ ok: true });
  } catch (error) {
    return handleAppError(error);
  }
}

