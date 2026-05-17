import { NextRequest } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/current-user";
import { ApiError } from "@/lib/errors";
import {
  createPaymentUrl,
  getPaymentProviders,
  getTopupQuote,
  type PaymentProviderId
} from "@/lib/payments";
import { handleAppError, parseJsonBody } from "@/lib/route";

const createPaymentSchema = z.object({
  provider: z.enum(["yoomoney", "sbp", "cryptobot", "heleket", "lzt"]),
  amountRub: z.coerce.number().int().min(100).max(1_000_000)
});

export async function GET() {
  try {
    await requireCurrentUser();

    return Response.json({
      providers: getPaymentProviders()
    });
  } catch (error) {
    return handleAppError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const payload = await parseJsonBody(request, createPaymentSchema);
    const provider = getPaymentProviders().find((item) => item.id === payload.provider);

    if (!provider) {
      throw new ApiError(400, "provider_not_found", "Payment provider not found");
    }

    if (!provider.enabled) {
      throw new ApiError(400, "provider_unavailable", `${provider.name} is not configured`);
    }

    const quote = getTopupQuote(payload.amountRub);
    const label = `${user.id}:${Date.now()}:${payload.provider}`;
    const paymentUrl = createPaymentUrl(payload.provider as PaymentProviderId, quote.amountRub, label);

    if (!paymentUrl) {
      throw new ApiError(400, "provider_unavailable", `${provider.name} does not expose direct payment URL`);
    }

    return Response.json({
      provider: {
        id: provider.id,
        name: provider.name
      },
      quote,
      paymentUrl
    });
  } catch (error) {
    return handleAppError(error);
  }
}
