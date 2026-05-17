import { NextRequest } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/current-user";
import { handleAppError, parseJsonBody } from "@/lib/route";
import { prisma } from "@/lib/prisma";

const createChatSchema = z.object({
  title: z.string().min(1).max(120).optional()
});

export async function GET() {
  try {
    const user = await requireCurrentUser();

    const chats = await prisma.imageChat.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() }
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 100
    });

    return Response.json({
      chats: chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        expiresAt: chat.expiresAt,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messageCount: chat.messages.length,
        preview: chat.messages.at(-1)?.prompt ?? null
      }))
    });
  } catch (error) {
    return handleAppError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const payload = await parseJsonBody(request, createChatSchema);

    const chat = await prisma.imageChat.create({
      data: {
        userId: user.id,
        title: payload.title ?? "AI chat",
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
      }
    });

    return Response.json({ chat });
  } catch (error) {
    return handleAppError(error);
  }
}

