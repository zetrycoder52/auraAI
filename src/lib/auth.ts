import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { env } from "@/lib/env";

export type AccessTokenPayload = {
  sub: string;
  role: "USER" | "ADMIN";
  sid: string;
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  sid: string;
  type: "refresh";
};

const ACCESS_COOKIE = "aura_access";
const REFRESH_COOKIE = "aura_refresh";

const textEncoder = new TextEncoder();

function accessSecret() {
  return textEncoder.encode(env().JWT_ACCESS_SECRET);
}

function refreshSecret() {
  return textEncoder.encode(env().JWT_REFRESH_SECRET);
}

export async function hashPassword(rawPassword: string) {
  return bcrypt.hash(rawPassword, 12);
}

export async function verifyPassword(rawPassword: string, passwordHash: string) {
  return bcrypt.compare(rawPassword, passwordHash);
}

export async function signAccessToken(payload: Omit<AccessTokenPayload, "type">) {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${env().JWT_ACCESS_EXPIRES_MIN}m`)
    .sign(accessSecret());
}

export async function signRefreshToken(payload: Omit<RefreshTokenPayload, "type">) {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${env().JWT_REFRESH_EXPIRES_DAYS}d`)
    .sign(refreshSecret());
}

export async function verifyAccessToken(token: string) {
  const verified = await jwtVerify<AccessTokenPayload>(token, accessSecret());
  if (verified.payload.type !== "access") {
    throw new Error("Invalid access token type");
  }

  return verified.payload;
}

export async function verifyRefreshToken(token: string) {
  const verified = await jwtVerify<RefreshTokenPayload>(token, refreshSecret());
  if (verified.payload.type !== "refresh") {
    throw new Error("Invalid refresh token type");
  }

  return verified.payload;
}

function cookieCommonOptions(maxAgeSeconds: number) {
  const isProd = env().NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds
  };
}

export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  response.cookies.set(ACCESS_COOKIE, accessToken, cookieCommonOptions(env().JWT_ACCESS_EXPIRES_MIN * 60));
  response.cookies.set(
    REFRESH_COOKIE,
    refreshToken,
    cookieCommonOptions(env().JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60)
  );
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", cookieCommonOptions(0));
  response.cookies.set(REFRESH_COOKIE, "", cookieCommonOptions(0));
}

export async function readAccessTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value ?? null;
}

export async function readRefreshTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE)?.value ?? null;
}

export const AUTH_COOKIE_NAMES = {
  ACCESS_COOKIE,
  REFRESH_COOKIE
};

