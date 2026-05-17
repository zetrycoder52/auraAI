import type { ProviderType, TransportType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type StartRequestLogInput = {
  requestId: string;
  userId?: string;
  apiKeyId?: string;
  endpoint: string;
  modelAlias: string;
  provider?: ProviderType;
  providerModel?: string;
  transport?: TransportType;
  ipAddress?: string;
  userAgent?: string;
  rawRequest?: unknown;
};

export async function startRequestLog(input: StartRequestLogInput) {
  return prisma.requestLog.create({
    data: {
      requestId: input.requestId,
      userId: input.userId,
      apiKeyId: input.apiKeyId,
      endpoint: input.endpoint,
      modelAlias: input.modelAlias,
      provider: input.provider,
      providerModel: input.providerModel,
      transport: input.transport ?? "HTTP",
      statusCode: 102,
      success: false,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs: 0,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      rawRequest: (input.rawRequest ?? null) as never
    }
  });
}

type FinishRequestLogInput = {
  id: string;
  statusCode: number;
  success: boolean;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  errorMessage?: string;
  billedTokens?: bigint;
  rawResponse?: unknown;
};

export async function finishRequestLog(input: FinishRequestLogInput) {
  return prisma.requestLog.update({
    where: { id: input.id },
    data: {
      statusCode: input.statusCode,
      success: input.success,
      promptTokens: input.promptTokens ?? 0,
      completionTokens: input.completionTokens ?? 0,
      totalTokens: input.totalTokens ?? 0,
      latencyMs: input.latencyMs,
      errorMessage: input.errorMessage,
      billedTokens: input.billedTokens ?? BigInt(0),
      rawResponse: (input.rawResponse ?? null) as never
    }
  });
}

