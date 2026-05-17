import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/current-user";
import { handleAppError, parseJsonBody } from "@/lib/route";
import { prisma } from "@/lib/prisma";
import { writeAdminLog } from "@/lib/admin-log";

const providerSchema = z.object({
  type: z.enum(["OPENAI", "OPENROUTER", "ANTHROPIC", "GEMINI"]),
  name: z.string().min(1),
  baseUrl: z.string().url(),
  enabled: z.boolean(),
  priority: z.number().int().nonnegative()
});

export async function GET() {
  try {
    await requireAdmin();

    const providers = await prisma.provider.findMany({
      orderBy: { priority: "asc" }
    });

    return Response.json({ providers });
  } catch (error) {
    return handleAppError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const payload = await parseJsonBody(request, providerSchema);

    const provider = await prisma.provider.upsert({
      where: { type: payload.type },
      update: {
        name: payload.name,
        baseUrl: payload.baseUrl,
        enabled: payload.enabled,
        priority: payload.priority
      },
      create: payload
    });

    await writeAdminLog(admin.id, "upsert_provider", "provider", provider.id, payload);

    return Response.json({ provider });
  } catch (error) {
    return handleAppError(error);
  }
}

