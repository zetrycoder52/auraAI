import { NextRequest } from "next/server";
import { TransactionType } from "@prisma/client";
import { requireAdmin } from "@/lib/current-user";
import { handleAppError, parseJsonBody } from "@/lib/route";
import { adminGrantSchema } from "@/lib/validators";
import { creditUserTokens } from "@/lib/billing";
import { writeAdminLog } from "@/lib/admin-log";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  try {
    const admin = await requireAdmin();
    const payload = await parseJsonBody(request, adminGrantSchema);
    const { id } = await context.params;

    const granted = await creditUserTokens(id, payload.amount, payload.reason, TransactionType.ADMIN_GRANT, {
      adminUserId: admin.id
    });

    await writeAdminLog(admin.id, "grant_tokens", "user", id, {
      amount: payload.amount,
      reason: payload.reason
    });

    return Response.json({
      ok: true,
      balance: Number(granted.nextBalance)
    });
  } catch (error) {
    return handleAppError(error);
  }
}

