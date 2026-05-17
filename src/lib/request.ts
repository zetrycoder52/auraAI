import type { NextRequest } from "next/server";

export function getIpAddress(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "0.0.0.0";
}

export function getUserAgent(request: NextRequest) {
  return request.headers.get("user-agent") ?? "unknown";
}

export function getRequestId(request: NextRequest) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function jsonResponse(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers
    }
  });
}

