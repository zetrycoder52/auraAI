import { prisma } from "@/lib/prisma";

export async function writeAdminLog(adminUserId: string, action: string, targetType: string, targetId?: string, metadata?: unknown) {
  return prisma.adminLog.create({
    data: {
      adminUserId,
      action,
      targetType,
      targetId,
      metadata: (metadata ?? null) as never
    }
  });
}

