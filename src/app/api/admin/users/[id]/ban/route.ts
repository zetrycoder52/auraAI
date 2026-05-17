import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { handleAppError, parseJsonBody } from "@/lib/route";
import { banSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { writeAdminLog } from "@/lib/admin-log";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  try {
    const admin = await requireAdmin();
    const payload = await parseJsonBody(request, banSchema);
    const { id } = await context.params;

    await prisma.user.update({
      where: { id },
      data: {
        isBanned: payload.banned,
        banReason: payload.banned ? payload.reason ?? "Banned by admin" : null
      }
    });

    if (payload.banned) {
      await prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await prisma.apiKey.updateMany({
        where: { userId: id, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() }
      });
    }

    await writeAdminLog(admin.id, payload.banned ? "ban_user" : "unban_user", "user", id, {
      reason: payload.reason
    });

    return Response.json({ ok: true });
  } catch (error) {
    return handleAppError(error);
  }
}

