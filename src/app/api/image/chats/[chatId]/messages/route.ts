import { NextRequest } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/current-user";
import { handleAppError, parseJsonBody } from "@/lib/route";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { generateImageForUser, generateTextForUser } from "@/lib/image-service";
import { finishRequestLog, startRequestLog } from "@/lib/request-log";
import { getIpAddress, getRequestId, getUserAgent } from "@/lib/request";

const createMessageSchema = z.object({
  prompt: z.string().min(1).max(8000),
  image: z.string().optional(),
  mode: z.enum(["image", "chat"]).default("image"),
  model: z.string().min(1).max(64).optional()
});

type Context = {
  params: Promise<{ chatId: string }>;
};

export async function GET(_request: NextRequest, context: Context) {
  try {
    const user = await requireCurrentUser();
    const { chatId } = await context.params;

    const chat = await prisma.imageChat.findFirst({
      where: { id: chatId, userId: user.id, expiresAt: { gt: new Date() } },
      include: { messages: { orderBy: { createdAt: "asc" } } }
    });

    if (!chat) {
      throw new ApiError(404, "chat_not_found", "Image chat not found or expired");
    }

    return Response.json({ chat });
  } catch (error) {
    return handleAppError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();
  let logId: string | null = null;

  try {
    const user = await requireCurrentUser();
    const { chatId } = await context.params;
    const payload = await parseJsonBody(request, createMessageSchema);

    const chat = await prisma.imageChat.findFirst({
      where: { id: chatId, userId: user.id, expiresAt: { gt: new Date() } }
    });

    if (!chat) {
      throw new ApiError(404, "chat_not_found", "Image chat not found or expired");
    }

    const mode = payload.mode ?? "image";
    const modelAlias = mode === "chat" ? payload.model ?? "gpt-5.4" : "gpt-image-2";
    const endpoint = mode === "chat" ? "/v1/responses" : "/v1/images/generations";

    const log = await startRequestLog({
      requestId,
      userId: user.id,
      endpoint,
      modelAlias,
      transport: "HTTP",
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
      rawRequest: {
        prompt: payload.prompt,
        mode,
        hasImage: Boolean(payload.image)
      }
    });
    logId = log.id;

    const userMessage = await prisma.imageMessage.create({
      data: {
        chatId,
        role: "USER",
        prompt: payload.prompt
      }
    });

    let assistantMessage: Awaited<ReturnType<typeof prisma.imageMessage.create>>;
    let usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      billedTokens: number;
    };
    let logRawResponse: Record<string, unknown>;

    if (mode === "chat") {
      const generated = await generateTextForUser(user.id, payload.prompt, log.id, modelAlias);

      assistantMessage = await prisma.imageMessage.create({
        data: {
          chatId,
          role: "ASSISTANT",
          prompt: generated.outputText || "(empty)",
          tokensCharged: generated.billing.billedTokens
        }
      });

      usage = generated.billing;
      logRawResponse = {
        mode: "chat",
        outputText: generated.outputText,
        usage: generated.billing
      };
    } else {
      const generated = await generateImageForUser(user.id, payload.prompt, payload.image, log.id);
      const imagePayload = generated.response?.data?.[0];
      const imageUrl =
        imagePayload?.url ??
        (imagePayload?.b64_json ? `data:image/png;base64,${imagePayload.b64_json}` : null);

      assistantMessage = await prisma.imageMessage.create({
        data: {
          chatId,
          role: "ASSISTANT",
          imageUrl,
          tokensCharged: generated.billing.billedTokens,
          prompt: payload.prompt
        }
      });

      usage = generated.billing;
      logRawResponse = {
        mode: "image",
        hasImage: Boolean(imageUrl),
        usage: generated.billing
      };
    }

    await prisma.imageChat.update({
      where: { id: chatId },
      data: {
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        title:
          chat.title === "Image chat" || chat.title === "AI chat"
            ? payload.prompt.slice(0, 50)
            : chat.title
      }
    });

    await finishRequestLog({
      id: log.id,
      statusCode: 200,
      success: true,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      billedTokens: BigInt(usage.billedTokens),
      latencyMs: Date.now() - startedAt,
      rawResponse: logRawResponse
    });

    return Response.json({
      userMessage,
      assistantMessage,
      usage
    });
  } catch (error) {
    if (logId) {
      await finishRequestLog({
        id: logId,
        statusCode: error instanceof ApiError ? error.status : 500,
        success: false,
        latencyMs: Date.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : "Image generation failed"
      }).catch(() => undefined);
    }

    return handleAppError(error);
  }
}
