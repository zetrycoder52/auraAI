import type { NextRequest } from "next/server";
import { ZodSchema } from "zod";
import { ApiError, toOpenAIError } from "@/lib/errors";
import { env } from "@/lib/env";

export async function parseJsonBody<T>(request: NextRequest, schema: ZodSchema<T>) {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const limit = env().REQUEST_BODY_LIMIT_MB * 1024 * 1024;
    if (Number(contentLength) > limit) {
      throw new ApiError(413, "payload_too_large", "Request payload too large");
    }
  }

  const json = await request.json().catch(() => {
    throw new ApiError(400, "invalid_json", "Invalid JSON payload");
  });

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(400, "validation_error", issue?.message ?? "Invalid request payload");
  }

  return parsed.data;
}

export function handleOpenAIError(error: unknown, requestId?: string) {
  const { status, body } = toOpenAIError(error, requestId);

  return Response.json(body, {
    status,
    headers: requestId ? { "x-request-id": requestId } : undefined
  });
}

export function handleAppError(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message
        }
      },
      { status: error.status }
    );
  }

  return Response.json(
    {
      error: {
        code: "internal_server_error",
        message: "Internal server error"
      }
    },
    { status: 500 }
  );
}

