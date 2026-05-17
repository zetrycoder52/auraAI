import { NextRequest } from "next/server";
import { imageGenerationSchema } from "@/lib/validators";
import { handleOpenAIError, parseJsonBody } from "@/lib/route";
import { proxyGatewayRequest } from "@/lib/gateway";
import { getRequestId } from "@/lib/request";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    const payload = await parseJsonBody(request, imageGenerationSchema);
    const response = await proxyGatewayRequest(request, "images", payload);
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    return handleOpenAIError(error, requestId);
  }
}

