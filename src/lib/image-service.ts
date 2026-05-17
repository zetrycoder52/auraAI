import { ProviderType } from "@prisma/client";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  callProvider,
  convertAnthropicToResponse
} from "@/lib/providers/proxy";
import {
  calculateBilledTokens,
  debitUserTokens,
  ensureUserHasBalance
} from "@/lib/billing";
import { computeBillingMultiplier, resolveModel } from "@/lib/models";

function normalizeUsageFromResponse(response: any) {
  const usage = response?.usage ?? {};

  const promptTokens =
    usage.prompt_tokens ??
    usage.input_tokens ??
    usage.promptTokens ??
    0;
  const completionTokens =
    usage.completion_tokens ??
    usage.output_tokens ??
    usage.completionTokens ??
    0;
  const totalTokens = usage.total_tokens ?? usage.totalTokens ?? promptTokens + completionTokens;

  return { promptTokens, completionTokens, totalTokens };
}

function extractOutputText(response: any) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  const outputBlocks = response?.output;
  if (Array.isArray(outputBlocks)) {
    for (const block of outputBlocks) {
      const content = block?.content;
      if (!Array.isArray(content)) continue;
      for (const item of content) {
        const text = item?.text;
        if (typeof text === "string" && text.trim()) {
          return text;
        }
      }
    }
  }

  const chatText = response?.choices?.[0]?.message?.content;
  if (typeof chatText === "string" && chatText.trim()) {
    return chatText;
  }

  return "";
}

export async function generateImageForUser(
  userId: string,
  prompt: string,
  image?: string,
  requestLogId?: string
) {
  const model = await prisma.modelConfig.findUnique({ where: { alias: "gpt-image-2" } });
  if (!model || !model.enabled) {
    throw new ApiError(400, "model_not_found", "gpt-image-2 model disabled");
  }

  const provider = await prisma.provider.findUnique({ where: { type: model.provider } });
  if (!provider || !provider.enabled) {
    throw new ApiError(503, "provider_unavailable", `Provider ${model.provider} disabled`);
  }

  await ensureUserHasBalance(userId, 300);

  const payload: Record<string, unknown> = {
    model: "gpt-image-2",
    prompt,
    n: 1,
    response_format: "b64_json"
  };

  if (image) {
    payload.image = image;
  }

  const response = await callProvider({
    endpoint: "images",
    payload,
    modelAlias: "gpt-image-2",
    modelConfig: model,
    provider,
    requestId: crypto.randomUUID(),
    stream: false
  });

  const json = await response.json();
  const usage = json?.usage ?? null;

  const promptTokens = usage?.prompt_tokens ?? usage?.input_tokens ?? 50;
  const completionTokens = usage?.completion_tokens ?? usage?.output_tokens ?? 300;
  const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;

  const multiplier = computeBillingMultiplier("gpt-image-2", payload, Number(model.priceMultiplier));
  const billed = calculateBilledTokens(totalTokens, multiplier);

  await debitUserTokens(userId, billed, "image generation", requestLogId, {
    model: "gpt-image-2",
    totalTokens,
    multiplier
  });

  return {
    response: json,
    billing: {
      promptTokens,
      completionTokens,
      totalTokens,
      billedTokens: billed
    }
  };
}

export async function generateTextForUser(
  userId: string,
  prompt: string,
  requestLogId?: string,
  modelAlias = "gpt-5.4"
) {
  const model = await resolveModel(modelAlias);
  if (!model.enabled || !model.supportsChat) {
    throw new ApiError(400, "model_not_supported", `${modelAlias} does not support chat`);
  }

  const provider = await prisma.provider.findUnique({ where: { type: model.provider } });
  if (!provider || !provider.enabled) {
    throw new ApiError(503, "provider_unavailable", `Provider ${model.provider} disabled`);
  }

  await ensureUserHasBalance(userId, 100);

  const payload: Record<string, unknown> = {
    model: modelAlias,
    input: prompt,
    stream: false
  };

  const providerResponse = await callProvider({
    endpoint: "responses",
    payload,
    modelAlias,
    modelConfig: model,
    provider,
    requestId: crypto.randomUUID(),
    stream: false
  });

  const rawResponse = await providerResponse.json();
  const normalizedResponse =
    provider.type === ProviderType.ANTHROPIC
      ? convertAnthropicToResponse(rawResponse, modelAlias, crypto.randomUUID())
      : rawResponse;

  const usage = normalizeUsageFromResponse(normalizedResponse);
  const safePromptTokens = usage.promptTokens || Math.max(1, Math.ceil(prompt.length / 4));
  const safeCompletionTokens = usage.completionTokens || 64;
  const safeTotalTokens = usage.totalTokens || safePromptTokens + safeCompletionTokens;
  const multiplier = computeBillingMultiplier(modelAlias, payload, Number(model.priceMultiplier));
  const billedTokens = calculateBilledTokens(safeTotalTokens, multiplier);

  await debitUserTokens(userId, billedTokens, "text chat generation", requestLogId, {
    model: modelAlias,
    totalTokens: safeTotalTokens,
    multiplier
  });

  return {
    response: normalizedResponse,
    outputText: extractOutputText(normalizedResponse),
    billing: {
      promptTokens: safePromptTokens,
      completionTokens: safeCompletionTokens,
      totalTokens: safeTotalTokens,
      billedTokens
    }
  };
}
