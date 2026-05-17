import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ authenticated: false }, { status: 401 });
  }

  const settings = await prisma.settings.findUnique({ where: { userId: user.id } });

  return Response.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenBalance: Number(user.tokenBalance),
      isBanned: user.isBanned,
      language: settings?.language ?? user.language,
      theme: settings?.theme ?? user.theme
    }
  });
}

