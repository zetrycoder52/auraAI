import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_COOKIE = "aura_access";
const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/pricing", "/api-docs"]);
const PUBLIC_PREFIXES = [
  "/v1",
  "/backend-api",
  "/icw",
  "/api"
];

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("x-dns-prefetch-control", "off");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("content-security-policy", "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https: ws: wss:;");
}

function applyCorsHeaders(request: NextRequest, response: NextResponse) {
  if (request.nextUrl.pathname.startsWith("/v1") || request.nextUrl.pathname.startsWith("/backend-api")) {
    const origin = request.headers.get("origin") ?? "*";
    response.headers.set("access-control-allow-origin", origin);
    response.headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
    response.headers.set("access-control-allow-headers", "Authorization,Content-Type,X-Api-Key,X-Request-Id,X-Aura-Transport");
    response.headers.set("access-control-expose-headers", "x-request-id");
    response.headers.set("vary", "Origin");
  }
}

async function verifyAdmin(token: string) {
  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      return false;
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload.role === "ADMIN";
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    applyCorsHeaders(request, response);
    applySecurityHeaders(response);
    return response;
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/public") || pathname.includes(".")) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  const token = request.cookies.get(ACCESS_COOKIE)?.value;

  let response: NextResponse;

  if (PUBLIC_ROUTES.has(pathname)) {
    if (token && (pathname === "/login" || pathname === "/register")) {
      response = NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      response = NextResponse.next();
    }

    applyCorsHeaders(request, response);
    applySecurityHeaders(response);
    return response;
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    response = NextResponse.next();
    applyCorsHeaders(request, response);
    applySecurityHeaders(response);
    return response;
  }

  if (!token) {
    response = NextResponse.redirect(new URL("/login", request.url));
    applySecurityHeaders(response);
    return response;
  }

  if (pathname.startsWith("/admin")) {
    const isAdmin = await verifyAdmin(token);
    if (!isAdmin) {
      response = NextResponse.redirect(new URL("/dashboard", request.url));
      applySecurityHeaders(response);
      return response;
    }
  }

  response = NextResponse.next();
  applyCorsHeaders(request, response);
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: ["/(.*)"]
};

