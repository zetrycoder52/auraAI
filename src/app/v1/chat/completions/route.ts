import { NextRequest } from "next/server";
import { chatCompletionSchema } from "@/lib/validators";
import { handleOpenAIError, parseJsonBody } from "@/lib/route";
import { proxyGatewayRequest } from "@/lib/gateway";
import { getRequestId } from "@/lib/request";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const payload = await parseJsonBody(request, chatCompletionSchema);
    const response = await proxyGatewayRequest(request, "chat", payload);
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    return handleOpenAIError(error, requestId);
  }
}

