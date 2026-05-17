import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-auth";
import { proxyGatewayRequest } from "@/lib/gateway";
import { handleOpenAIError, parseJsonBody } from "@/lib/route";
import { getRequestId } from "@/lib/request";
import { listEnabledModels } from "@/lib/models";

export const runtime = "nodejs";

const codexSchema = z.object({
  endpoint: z
    .enum(["/v1/chat/completions", "/v1/responses", "/v1/embeddings", "/v1/images/generations", "/v1/models"])
    .optional(),
  payload: z.record(z.string(), z.any()).optional()
});

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const auth = await authenticateApiKey(request);
    const models = await listEnabledModels();

    return Response.json(
      {
        providerId: "auraai",
        name: "AuraAI",
        status: "ok",
        user: {
          id: auth.user.id,
          email: auth.user.email,
          balance: Number(auth.user.tokenBalance)
        },
        endpoints: {
          models: "/v1/models",
          chat: "/v1/chat/completions",
          responses: "/v1/responses",
          embeddings: "/v1/embeddings",
          images: "/v1/images/generations",
          codex: "/backend-api/codex",
          websocket: "/backend-api/codex/ws"
        },
        models: models.map((item) => item.alias)
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    return handleOpenAIError(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const payload = await parseJsonBody(request, codexSchema);
    const endpoint = payload.endpoint ?? "/v1/responses";

    if (endpoint === "/v1/models") {
      await authenticateApiKey(request);
      const models = await listEnabledModels();
      return Response.json(
        {
          object: "list",
          data: models.map((model) => ({
            id: model.alias,
            object: "model",
            created: Math.floor(model.createdAt.getTime() / 1000),
            owned_by: "AuraAI"
          }))
        },
        { headers: { "x-request-id": requestId } }
      );
    }

    let gatewayEndpoint: "chat" | "responses" | "embeddings" | "images" = "responses";

    if (endpoint === "/v1/chat/completions") gatewayEndpoint = "chat";
    if (endpoint === "/v1/embeddings") gatewayEndpoint = "embeddings";
    if (endpoint === "/v1/images/generations") gatewayEndpoint = "images";

    const data = payload.payload ?? {};
    const transport = request.headers.get("x-aura-transport")?.toLowerCase() === "ws" ? "WS" : "HTTP";
    const response = await proxyGatewayRequest(request, gatewayEndpoint, data, transport);
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    return handleOpenAIError(error, requestId);
  }
}


