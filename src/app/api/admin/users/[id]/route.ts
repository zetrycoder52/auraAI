import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { handleAppError } from "@/lib/route";
import { prisma } from "@/lib/prisma";
import { writeAdminLog } from "@/lib/admin-log";

type Context = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isBanned: true,
        banReason: "Deleted by admin"
      }
    });

    await prisma.apiKey.updateMany({
      where: { userId: id, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() }
    });

    await prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    await writeAdminLog(admin.id, "delete_user", "user", id);

    return Response.json({ ok: true });
  } catch (error) {
    return handleAppError(error);
  }
}

