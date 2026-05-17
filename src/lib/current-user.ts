import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { readAccessTokenFromCookies, verifyAccessToken } from "@/lib/auth";

export async function getCurrentUser() {
  const token = await readAccessTokenFromCookies();
  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(token);
    return prisma.user.findUnique({ where: { id: payload.sub } });
  } catch {
    return null;
  }
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(401, "unauthorized", "Authentication required");
  }

  if (user.isBanned) {
    throw new ApiError(403, "user_banned", "User is banned");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireCurrentUser();
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "forbidden", "Admin access required");
  }

  return user;
}

