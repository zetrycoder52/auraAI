import { z } from "zod";
import path from "path";

function emptyToUndefined(value: unknown) {
  return value === "" ? undefined : value;
}

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  JWT_ACCESS_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  JWT_REFRESH_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  JWT_ACCESS_EXPIRES_MIN: z.coerce.number().int().positive().default(15),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().int().positive().default(30),
  REDIS_URL: optionalString,
  OPENAI_API_KEY: optionalString,
  OPENROUTER_API_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  GEMINI_API_KEY: optionalString,
  NEXT_PUBLIC_APP_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  INTERNAL_API_TIMEOUT_MS: z.coerce.number().int().positive().default(90000),
  REQUEST_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
  REQUEST_BODY_LIMIT_MB: z.coerce.number().int().positive().default(4),
  DEFAULT_NEW_USER_TOKENS: z.coerce.number().int().nonnegative().default(0),
  ADMIN_EMAIL: z.string().email().default("admin@auraai.local"),
  ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!")
});

type ParsedEnv = z.infer<typeof envSchema> & {
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  NEXT_PUBLIC_APP_URL: string;
};

let cachedEnv: ParsedEnv | null = null;

function devDatabaseUrl() {
  const devDbPath = path.join(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/");
  return `file:${devDbPath}`;
}

function withDevDefaults(parsed: z.infer<typeof envSchema>): ParsedEnv {
  const isProduction = parsed.NODE_ENV === "production";

  const data = {
    ...parsed,
    DEFAULT_NEW_USER_TOKENS:
      !isProduction && process.env.DEFAULT_NEW_USER_TOKENS === undefined
        ? 100_000
        : parsed.DEFAULT_NEW_USER_TOKENS,
    DATABASE_URL: parsed.DATABASE_URL ?? devDatabaseUrl(),
    JWT_ACCESS_SECRET:
      parsed.JWT_ACCESS_SECRET ?? "auraai_dev_access_secret_32_chars_min",
    JWT_REFRESH_SECRET:
      parsed.JWT_REFRESH_SECRET ?? "auraai_dev_refresh_secret_32_chars_min",
    NEXT_PUBLIC_APP_URL: parsed.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  };

  if (isProduction) {
    const fieldErrors: Record<string, string[]> = {};

    if (!parsed.DATABASE_URL) {
      fieldErrors.DATABASE_URL = ["DATABASE_URL is required in production"];
    }

    if (!parsed.JWT_ACCESS_SECRET || parsed.JWT_ACCESS_SECRET.length < 32) {
      fieldErrors.JWT_ACCESS_SECRET = ["JWT_ACCESS_SECRET must be at least 32 chars in production"];
    }

    if (!parsed.JWT_REFRESH_SECRET || parsed.JWT_REFRESH_SECRET.length < 32) {
      fieldErrors.JWT_REFRESH_SECRET = ["JWT_REFRESH_SECRET must be at least 32 chars in production"];
    }

    if (Object.keys(fieldErrors).length > 0) {
      console.error("Invalid environment config", fieldErrors);
      throw new Error("Invalid environment config");
    }
  }

  process.env["DATABASE_URL"] = data.DATABASE_URL;
  process.env["JWT_ACCESS_SECRET"] = data.JWT_ACCESS_SECRET;
  process.env["JWT_REFRESH_SECRET"] = data.JWT_REFRESH_SECRET;

  return data;
}

export function env() {
  if (!cachedEnv) {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
      console.error("Invalid environment config", parsed.error.flatten().fieldErrors);
      throw new Error("Invalid environment config");
    }

    cachedEnv = withDevDefaults(parsed.data);
  }

  return cachedEnv;
}

export type Env = ReturnType<typeof env>;

