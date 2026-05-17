import { ProviderType, type TransportType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { touchApiKeyUsage } from "@/lib/api-keys";
import { calculateBilledTokens, debitUserTokens, ensureUserHasBalance } from "@/lib/billing";
import { ApiError } from "@/lib/errors";
import { computeBillingMultiplier, resolveModel } from "@/lib/models";
import { prisma } from "@/lib/prisma";
import { callProvider, convertAnthropicToChatCompletion, convertAnthropicToResponse, type ProxyEndpoint } from "@/lib/providers/proxy";
import { finishRequestLog, startRequestLog } from "@/lib/request-log";
import { getRequestId, getUserAgent } from "@/lib/request";
import { chatCompletionToResponseObject, responseObjectToChatCompletion } from "@/lib/response-converters";
import { convertAnthropicStreamToOpenAI, trackOpenAIStream, type StreamUsage } from "@/lib/sse";

function extractStringLength(value: unknown): number {
  if (typeof value === "string") {
    return value.length;
  }

  if (Array.isArray(value)) {
    return value.reduce((acc, item) => acc + extractStringLength(item), 0);
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value).length;
  }

  return 0;
}

function estimatePromptTokens(payload: any) {
  const fromMessages = extractStringLength(payload?.messages);
  const fromInput = extractStringLength(payload?.input);
  const promptSize = fromMessages + fromInput;
  return Math.max(1, Math.ceil(promptSize / 4));
}

function estimateCompletionTokens(outputText: string, payload: any) {
  const fromText = Math.ceil(outputText.length / 4);
  const maxTokens = payload?.max_tokens ?? payload?.max_output_tokens;

  if (typeof maxTokens === "number") {
    return Math.max(fromText, Math.min(maxTokens, 4096));
  }

  return Math.max(fromText, 64);
}

function extractUsageFromPayload(payload: any, endpoint: ProxyEndpoint) {
  if (!payload || typeof payload !== "object") {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  const usage = (payload as any).usage;

  if (!usage) {
    if (endpoint === "images") {
      const n = Number((payload as any).n ?? 1);
      const promptTokens = 50;
      const completionTokens = 300 * n;
      return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens };
    }

    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  const promptTokens = usage.prompt_tokens ?? usage.input_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? usage.output_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;

  return { promptTokens, completionTokens, totalTokens };
}

async function finalizeBillingAndLogs(params: {
  logId: string;
  userId: string;
  apiKeyId: string;
  requestId: string;
  statusCode: number;
  success: boolean;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  multiplier: number;
  endpointPath: string;
  modelAlias: string;
  latencyMs: number;
  rawResponse?: unknown;
  errorMessage?: string;
}) {
  const billed = params.totalTokens > 0 ? calculateBilledTokens(params.totalTokens, params.multiplier) : 0;

  if (params.success && billed > 0) {
    await debitUserTokens(params.userId, billed, `${params.endpointPath} ${params.modelAlias}`, params.logId, {
      requestId: params.requestId,
      tokens: params.totalTokens,
      multiplier: params.multiplier
    });
    await touchApiKeyUsage(params.apiKeyId, params.totalTokens);
  }

  await finishRequestLog({
    id: params.logId,
    statusCode: params.statusCode,
    success: params.success,
    promptTokens: params.promptTokens,
    completionTokens: params.completionTokens,
    totalTokens: params.totalTokens,
    latencyMs: params.latencyMs,
    errorMessage: params.errorMessage,
    billedTokens: BigInt(billed),
    rawResponse: params.rawResponse
  });
}

async function getProvider(providerType: ProviderType) {
  const provider = await prisma.provider.findUnique({ where: { type: providerType } });
  if (!provider || !provider.enabled) {
    throw new ApiError(503, "provider_unavailable", `Provider ${providerType} is disabled`);
  }

  return provider;
}

export async function proxyGatewayRequest(
  request: NextRequest,
  endpoint: ProxyEndpoint,
  payload: Record<string, unknown>,
  transport: TransportType = "HTTP"
) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();

  const auth = await authenticateApiKey(request);
  const modelAlias = (payload.model as string | undefined) ?? (endpoint === "images" ? "gpt-image-2" : "gpt-5.4");
  const model = await resolveModel(modelAlias);

  if (endpoint === "images" && !model.supportsImages) {
    throw new ApiError(400, "model_not_supported", `Model '${modelAlias}' does not support images`);
  }

  if (endpoint === "embeddings" && !model.supportsEmbeds) {
    throw new ApiError(400, "model_not_supported", `Model '${modelAlias}' does not support embeddings`);
  }

  if ((endpoint === "chat" || endpoint === "responses") && !model.supportsChat) {
    throw new ApiError(400, "model_not_supported", `Model '${modelAlias}' does not support chat/responses`);
  }

  const provider = await getProvider(model.provider);
  const multiplier = computeBillingMultiplier(modelAlias, payload, Number(model.priceMultiplier));

  const minimumPreauth = Math.max(1, Math.min(100_000, (payload.max_tokens as number) ?? (payload.max_output_tokens as number) ?? 256));
  await ensureUserHasBalance(auth.user.id, minimumPreauth);

  const log = await startRequestLog({
    requestId,
    userId: auth.user.id,
    apiKeyId: auth.apiKey.id,
    endpoint: endpoint === "chat" ? "/v1/chat/completions" : endpoint === "responses" ? "/v1/responses" : endpoint === "embeddings" ? "/v1/embeddings" : "/v1/images/generations",
    modelAlias,
    provider: provider.type,
    providerModel: model.providerModelId,
    transport,
    ipAddress: auth.ipAddress,
    userAgent: getUserAgent(request),
    rawRequest: payload
  });

  const streamRequested = payload.stream === true;

  try {
    const providerResponse = await callProvider({
      endpoint,
      payload,
      modelAlias,
      modelConfig: model,
      provider,
      requestId,
      stream: streamRequested
    });

    if (streamRequested) {
      if (!providerResponse.body) {
        throw new ApiError(502, "invalid_upstream_stream", "Provider returned empty stream", requestId);
      }

      const finalize = async (usage: StreamUsage) => {
        const promptTokens = usage.promptTokens || estimatePromptTokens(payload);
        const completionTokens = usage.completionTokens || estimateCompletionTokens(usage.outputText, payload);
        const totalTokens = usage.totalTokens || promptTokens + completionTokens;

        try {
          await finalizeBillingAndLogs({
            logId: log.id,
            userId: auth.user.id,
            apiKeyId: auth.apiKey.id,
            requestId,
            statusCode: 200,
            success: true,
            promptTokens,
            completionTokens,
            totalTokens,
            multiplier,
            endpointPath: log.endpoint,
            modelAlias,
            latencyMs: Date.now() - startedAt
          });
        } catch (error) {
          console.error("Failed to finalize stream billing", error);
        }
      };

      const tracked =
        provider.type === ProviderType.ANTHROPIC
          ? convertAnthropicStreamToOpenAI(providerResponse.body, modelAlias, requestId, endpoint === "responses" ? "responses" : "chat", finalize)
          : trackOpenAIStream(providerResponse.body, finalize);

      return new Response(tracked.stream, {
        status: 200,
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
          "x-request-id": requestId
        }
      });
    }

    const upstreamJson = await providerResponse.json();

    const normalized =
      provider.type === ProviderType.ANTHROPIC
        ? endpoint === "responses"
          ? convertAnthropicToResponse(upstreamJson, modelAlias, requestId)
          : convertAnthropicToChatCompletion(upstreamJson, modelAlias, requestId)
        : upstreamJson;

    let finalPayload = normalized;

    if (endpoint === "responses" && normalized?.object === "chat.completion") {
      finalPayload = chatCompletionToResponseObject(normalized);
    }

    if (endpoint === "chat" && normalized?.object === "response") {
      finalPayload = responseObjectToChatCompletion(normalized, modelAlias);
    }

    const usage = extractUsageFromPayload(finalPayload, endpoint);

    const promptTokens = usage.promptTokens || estimatePromptTokens(payload);
    const completionTokens = usage.completionTokens || estimateCompletionTokens(JSON.stringify(finalPayload), payload);
    const totalTokens = usage.totalTokens || promptTokens + completionTokens;

    await finalizeBillingAndLogs({
      logId: log.id,
      userId: auth.user.id,
      apiKeyId: auth.apiKey.id,
      requestId,
      statusCode: 200,
      success: true,
      promptTokens,
      completionTokens,
      totalTokens,
      multiplier,
      endpointPath: log.endpoint,
      modelAlias,
      latencyMs: Date.now() - startedAt,
      rawResponse: finalPayload
    });

    return Response.json(finalPayload, {
      headers: {
        "x-request-id": requestId
      }
    });
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : "Internal server error";

    await finishRequestLog({
      id: log.id,
      statusCode,
      success: false,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs: Date.now() - startedAt,
      errorMessage: message
    });

    throw error;
  }
}

