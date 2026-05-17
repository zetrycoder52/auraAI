import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toBigInt(value: number | string | bigint) {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number") {
    return BigInt(Math.trunc(value));
  }

  return BigInt(value);
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function bigintToNumber(value: bigint) {
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  if (value > max) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Number(value);
}

