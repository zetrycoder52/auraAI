import { createHash, randomBytes } from "crypto";

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function secureRandom(length = 32) {
  return randomBytes(length).toString("base64url");
}

