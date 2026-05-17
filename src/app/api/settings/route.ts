import { NextRequest } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/current-user";
import { handleAppError, parseJsonBody } from "@/lib/route";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserSettings } from "@/lib/user-settings";

const settingsSchema = z.object({
  language: z.enum(["ru", "en"]).optional(),
  theme: z.enum(["light", "dark"]).optional(),
  telegramHandle: z.string().max(128).nullable().optional()
});

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const settings = await getOrCreateUserSettings(user.id);

    return Response.json({
      settings: {
        language: settings.language,
        theme: settings.theme,
        telegramHandle: settings.telegramHandle
      }
    });
  } catch (error) {
    return handleAppError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const payload = await parseJsonBody(request, settingsSchema);

    const settings = await prisma.settings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        language: payload.language ?? "ru",
        theme: payload.theme ?? "light",
        telegramHandle: payload.telegramHandle ?? null
      },
      update: {
        language: payload.language,
        theme: payload.theme,
        telegramHandle: payload.telegramHandle
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        language: settings.language,
        theme: settings.theme,
        telegramId: settings.telegramHandle ?? undefined
      }
    });

    return Response.json({
      settings: {
        language: settings.language,
        theme: settings.theme,
        telegramHandle: settings.telegramHandle
      }
    });
  } catch (error) {
    return handleAppError(error);
  }
}

