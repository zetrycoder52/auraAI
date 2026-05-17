import { requireCurrentUser } from "@/lib/current-user";
import { createApiKey } from "@/lib/api-keys";
import { handleAppError } from "@/lib/route";

export async function POST() {
  try {
    const user = await requireCurrentUser();
    const created = await createApiKey(user.id, "Instructions setup key");

    return Response.json({
      key: {
        id: created.apiKey.id,
        name: created.apiKey.name,
        maskedKey: `${created.apiKey.prefix}****${created.apiKey.last4}`,
        createdAt: created.apiKey.createdAt
      },
      rawKey: created.rawKey
    });
  } catch (error) {
    return handleAppError(error);
  }
}
