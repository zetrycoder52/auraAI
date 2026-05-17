import { NextRequest } from "next/server";
import { Prisma, TransportType } from "@prisma/client";
import { requireCurrentUser } from "@/lib/current-user";
import { handleAppError } from "@/lib/route";
import { prisma } from "@/lib/prisma";

function parseIntSafe(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const searchParams = request.nextUrl.searchParams;

    const page = parseIntSafe(searchParams.get("page"), 1, 1, 10_000);
    const pageSize = parseIntSafe(searchParams.get("pageSize"), 25, 5, 100);
    const transportRaw = searchParams.get("transport");
    const query = searchParams.get("query")?.trim();
    const statusRaw = searchParams.get("status");

    const where: Prisma.RequestLogWhereInput = { userId: user.id };

    if (transportRaw === TransportType.HTTP || transportRaw === TransportType.WS) {
      where.transport = transportRaw;
    }

    const parsedStatus = statusRaw ? Number.parseInt(statusRaw, 10) : NaN;
    if (Number.isFinite(parsedStatus)) {
      where.statusCode = parsedStatus;
    }

    if (query) {
      where.OR = [
        { modelAlias: { contains: query } },
        { endpoint: { contains: query } },
        { errorMessage: { contains: query } },
        { providerModel: { contains: query } }
      ];
    }

    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      prisma.requestLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize
      }),
      prisma.requestLog.count({ where })
    ]);

    return Response.json({
      logs: logs.map((log) => ({
        id: log.id,
        time: log.createdAt,
        model: log.modelAlias,
        transport: log.transport,
        status: log.statusCode,
        tokens: log.totalTokens,
        error: log.errorMessage,
        endpoint: log.endpoint,
        latency: log.latencyMs,
        cost: Number(log.billedTokens),
        provider: log.provider,
        requestId: log.requestId
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  } catch (error) {
    return handleAppError(error);
  }
}

