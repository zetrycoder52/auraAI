import { prisma } from "@/lib/prisma";

export async function getOrCreateUserSettings(userId: string) {
  const existing = await prisma.settings.findUnique({ where: { userId } });
  if (existing) {
    return existing;
  }

  return prisma.settings.create({
    data: {
      userId,
      language: "ru",
      theme: "light"
    }
  });
}

