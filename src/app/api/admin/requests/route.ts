import { requireAdmin } from "@/lib/current-user";
import { handleAppError } from "@/lib/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const logs = await prisma.requestLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        user: { select: { email: true } },
        apiKey: { select: { name: true, prefix: true, last4: true } }
      }
    });

    return Response.json({
      requests: logs.map((log) => ({
        id: log.id,
        requestId: log.requestId,
        userEmail: log.user?.email ?? null,
        apiKey: log.apiKey ? `${log.apiKey.prefix}****${log.apiKey.last4}` : null,
        model: log.modelAlias,
        provider: log.provider,
        endpoint: log.endpoint,
        transport: log.transport,
        statusCode: log.statusCode,
        success: log.success,
        totalTokens: log.totalTokens,
        billedTokens: Number(log.billedTokens),
        latencyMs: log.latencyMs,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt
      }))
    });
  } catch (error) {
    return handleAppError(error);
  }
}

