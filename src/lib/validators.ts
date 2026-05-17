import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export const loginSchema = registerSchema;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(128)
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(64),
  expiresAt: z.string().datetime().optional(),
  allowedIps: z.array(z.string()).optional(),
  maxRequestsPerDay: z.number().int().positive().optional(),
  maxTokensPerDay: z.number().int().positive().optional()
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(64).optional(),
  allowedIps: z.array(z.string()).optional(),
  maxRequestsPerDay: z.number().int().positive().nullable().optional(),
  maxTokensPerDay: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  status: z.enum(["ACTIVE", "REVOKED"]).optional()
});

export const chatCompletionSchema = z.object({
  model: z.string().min(1),
  messages: z.array(z.object({ role: z.string(), content: z.any() }).passthrough()).min(1),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().optional(),
  max_tokens: z.number().int().positive().optional(),
  reasoning_effort: z.enum(["none", "minimal", "low", "medium", "high", "xhigh"]).optional(),
  metadata: z.record(z.string(), z.any()).optional()
}).passthrough();

export const responseSchema = z.object({
  model: z.string().min(1),
  input: z.any(),
  stream: z.boolean().optional(),
  max_output_tokens: z.number().int().positive().optional(),
  reasoning: z.object({ effort: z.enum(["none", "minimal", "low", "medium", "high", "xhigh"]).optional() }).optional()
}).passthrough();

export const embeddingsSchema = z.object({
  model: z.string().min(1),
  input: z.union([z.string(), z.array(z.string())]),
  dimensions: z.number().int().positive().optional()
}).passthrough();

export const imageGenerationSchema = z.object({
  model: z.string().default("gpt-image-2"),
  prompt: z.string().min(1),
  size: z.string().optional(),
  n: z.number().int().min(1).max(4).optional(),
  response_format: z.enum(["url", "b64_json"]).optional(),
  image: z.string().optional()
}).passthrough();

export const adminGrantSchema = z.object({
  amount: z.number().int(),
  reason: z.string().min(1).max(256)
});

export const banSchema = z.object({
  banned: z.boolean(),
  reason: z.string().max(256).optional()
});

export const modelConfigSchema = z.object({
  alias: z.string().min(1),
  provider: z.enum(["OPENAI", "OPENROUTER", "ANTHROPIC", "GEMINI"]),
  providerModelId: z.string().min(1),
  priceMultiplier: z.number().positive(),
  enabled: z.boolean(),
  maxTokens: z.number().int().positive(),
  priority: z.number().int().nonnegative(),
  supportsChat: z.boolean(),
  supportsEmbeds: z.boolean(),
  supportsImages: z.boolean()
});


