import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { handleAppError, parseJsonBody } from "@/lib/route";
import { modelConfigSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { writeAdminLog } from "@/lib/admin-log";

export async function GET() {
  try {
    await requireAdmin();

    const models = await prisma.modelConfig.findMany({
      orderBy: [{ priority: "asc" }, { alias: "asc" }]
    });

    return Response.json({ models });
  } catch (error) {
    return handleAppError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const payload = await parseJsonBody(request, modelConfigSchema);

    const model = await prisma.modelConfig.upsert({
      where: { alias: payload.alias },
      update: {
        provider: payload.provider,
        providerModelId: payload.providerModelId,
        priceMultiplier: payload.priceMultiplier,
        enabled: payload.enabled,
        maxTokens: payload.maxTokens,
        priority: payload.priority,
        supportsChat: payload.supportsChat,
        supportsEmbeds: payload.supportsEmbeds,
        supportsImages: payload.supportsImages
      },
      create: {
        alias: payload.alias,
        provider: payload.provider,
        providerModelId: payload.providerModelId,
        priceMultiplier: payload.priceMultiplier,
        enabled: payload.enabled,
        maxTokens: payload.maxTokens,
        priority: payload.priority,
        supportsChat: payload.supportsChat,
        supportsEmbeds: payload.supportsEmbeds,
        supportsImages: payload.supportsImages
      }
    });

    await writeAdminLog(admin.id, "upsert_model_config", "model", model.id, payload);

    return Response.json({ model });
  } catch (error) {
    return handleAppError(error);
  }
}

