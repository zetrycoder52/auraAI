import { NextRequest } from "next/server";
import { listEnabledModels } from "@/lib/models";
import { authenticateApiKey } from "@/lib/api-auth";
import { handleOpenAIError } from "@/lib/route";
import { getRequestId } from "@/lib/request";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
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
      {
        headers: {
          "x-request-id": requestId
        }
      }
    );
  } catch (error) {
    return handleOpenAIError(error, requestId);
  }
}

