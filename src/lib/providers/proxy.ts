import { ProviderType, type ModelConfig, type Provider } from "@prisma/client";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";

export type ProxyEndpoint = "chat" | "responses" | "embeddings" | "images";

export type ProxyCallInput = {
  endpoint: ProxyEndpoint;
  payload: Record<string, unknown>;
  modelAlias: string;
  modelConfig: ModelConfig;
  provider: Provider;
  requestId: string;
  stream: boolean;
};

function providerApiKey(type: ProviderType) {
  switch (type) {
    case ProviderType.OPENAI:
      return env().OPENAI_API_KEY;
    case ProviderType.OPENROUTER:
      return env().OPENROUTER_API_KEY;
    case ProviderType.ANTHROPIC:
      return env().ANTHROPIC_API_KEY;
    case ProviderType.GEMINI:
      return env().GEMINI_API_KEY;
    default:
      return undefined;
  }
}

function resolveBaseUrl(provider: Provider) {
  if (provider.type === ProviderType.GEMINI) {
    if (provider.baseUrl.includes("/openai")) {
      return provider.baseUrl;
    }

    return `${provider.baseUrl.replace(/\/+$/, "")}/v1beta/openai`;
  }

  return provider.baseUrl;
}

function resolvePath(endpoint: ProxyEndpoint, providerType: ProviderType) {
  if (providerType === ProviderType.ANTHROPIC) {
    if (endpoint === "chat" || endpoint === "responses") {
      return "/v1/messages";
    }

    throw new ApiError(400, "provider_not_supported", `Anthropic does not support '${endpoint}' endpoint in this gateway`);
  }

  switch (endpoint) {
    case "chat":
      return "/v1/chat/completions";
    case "responses":
      return "/v1/responses";
    case "embeddings":
      return "/v1/embeddings";
    case "images":
      return "/v1/images/generations";
    default:
      throw new ApiError(400, "invalid_endpoint", "Unsupported endpoint");
  }
}

function joinUrl(base: string, path: string) {
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (
    (normalizedBase.endsWith("/v1") || normalizedBase.endsWith("/openai")) &&
    normalizedPath.startsWith("/v1/")
  ) {
    return `${normalizedBase}${normalizedPath.slice(3)}`;
  }

  return `${normalizedBase}${normalizedPath}`;
}

function buildHeaders(provider: Provider) {
  const key = providerApiKey(provider.type);
  if (!key) {
    throw new ApiError(503, "provider_not_configured", `Missing API key for provider ${provider.type}`);
  }

  const headers: Record<string, string> = {
    "content-type": "application/json"
  };

  if (provider.type === ProviderType.ANTHROPIC) {
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers.Authorization = `Bearer ${key}`;
  }

  if (provider.type === ProviderType.OPENROUTER) {
    headers["HTTP-Referer"] = env().NEXT_PUBLIC_APP_URL;
    headers["X-Title"] = "AuraAI";
  }

  return headers;
}

function normalizeAnthropicPayload(payload: Record<string, unknown>, modelId: string, stream: boolean) {
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  const systemMessages = messages
    .filter((message: any) => message?.role === "system")
    .map((message: any) => (typeof message?.content === "string" ? message.content : JSON.stringify(message.content)));

  const userMessages = messages
    .filter((message: any) => message?.role !== "system")
    .map((message: any) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: typeof message?.content === "string" ? message.content : JSON.stringify(message?.content)
    }));

  return {
    model: modelId,
    max_tokens: (payload.max_tokens as number) ?? 2048,
    temperature: payload.temperature ?? 1,
    messages: userMessages,
    system: systemMessages.length ? systemMessages.join("\n\n") : undefined,
    stream
  };
}

export async function callProvider(input: ProxyCallInput) {
  const baseUrl = resolveBaseUrl(input.provider);
  const endpointPath = resolvePath(input.endpoint, input.provider.type);
  const url = joinUrl(baseUrl, endpointPath);
  const headers = buildHeaders(input.provider);

  let bodyPayload: Record<string, unknown> = {
    ...input.payload,
    model: input.modelConfig.providerModelId
  };

  if (input.endpoint === "chat" && input.stream && input.provider.type !== ProviderType.ANTHROPIC) {
    bodyPayload = {
      ...bodyPayload,
      stream_options: {
        include_usage: true
      }
    };
  }

  if (input.provider.type === ProviderType.ANTHROPIC) {
    if (input.endpoint === "responses" && !bodyPayload.messages && bodyPayload.input) {
      const responseInput = bodyPayload.input;
      bodyPayload = {
        messages: [{ role: "user", content: typeof responseInput === "string" ? responseInput : JSON.stringify(responseInput) }],
        max_tokens: bodyPayload.max_output_tokens ?? 2048,
        temperature: bodyPayload.temperature
      };
    }

    bodyPayload = normalizeAnthropicPayload(bodyPayload, input.modelConfig.providerModelId, input.stream);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env().INTERNAL_API_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyPayload),
      signal: controller.signal
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new ApiError(504, "upstream_timeout", "Upstream provider request timeout", input.requestId);
    }

    throw new ApiError(502, "provider_unreachable", "Failed to connect upstream provider", input.requestId);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    let upstream: any = null;

    if (contentType.includes("application/json")) {
      upstream = await response.json().catch(() => null);
    } else {
      upstream = await response.text().catch(() => "");
    }

    const message = upstream?.error?.message ?? upstream?.message ?? `Provider error (${response.status})`;
    throw new ApiError(response.status, "upstream_error", message, input.requestId);
  }

  return response;
}

export function convertAnthropicToChatCompletion(
  anthropicResponse: any,
  modelAlias: string,
  requestId: string
): Record<string, unknown> {
  const outputText = Array.isArray(anthropicResponse?.content)
    ? anthropicResponse.content
        .map((item: any) => item?.text)
        .filter(Boolean)
        .join("")
    : "";

  return {
    id: anthropicResponse?.id ?? `chatcmpl_${requestId}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: modelAlias,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: outputText
        },
        finish_reason: anthropicResponse?.stop_reason ?? "stop"
      }
    ],
    usage: {
      prompt_tokens: anthropicResponse?.usage?.input_tokens ?? 0,
      completion_tokens: anthropicResponse?.usage?.output_tokens ?? 0,
      total_tokens: (anthropicResponse?.usage?.input_tokens ?? 0) + (anthropicResponse?.usage?.output_tokens ?? 0)
    }
  };
}

export function convertAnthropicToResponse(anthropicResponse: any, modelAlias: string, requestId: string) {
  const text = Array.isArray(anthropicResponse?.content)
    ? anthropicResponse.content
        .map((item: any) => item?.text)
        .filter(Boolean)
        .join("")
    : "";

  const inputTokens = anthropicResponse?.usage?.input_tokens ?? 0;
  const outputTokens = anthropicResponse?.usage?.output_tokens ?? 0;

  return {
    id: anthropicResponse?.id ?? `resp_${requestId}`,
    object: "response",
    created_at: Math.floor(Date.now() / 1000),
    model: modelAlias,
    output_text: text,
    output: [
      {
        type: "message",
        id: `msg_${requestId}`,
        role: "assistant",
        content: [
          {
            type: "output_text",
            text,
            annotations: []
          }
        ]
      }
    ],
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens
    }
  };
}

