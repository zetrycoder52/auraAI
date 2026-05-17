import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { handleAppError } from "@/lib/route";
import { prisma } from "@/lib/prisma";
import { writeAdminLog } from "@/lib/admin-log";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: Context) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;

    await prisma.apiKey.update({
      where: { id },
      data: {
        status: "REVOKED",
        revokedAt: new Date()
      }
    });

    await writeAdminLog(admin.id, "revoke_api_key", "api_key", id);

    return Response.json({ ok: true });
  } catch (error) {
    return handleAppError(error);
  }
}

