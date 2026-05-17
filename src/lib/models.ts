import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";

export async function resolveModel(alias: string) {
  const config = await prisma.modelConfig.findUnique({ where: { alias } });
  if (!config || !config.enabled) {
    throw new ApiError(404, "model_not_found", `Model '${alias}' is not available`);
  }

  return config;
}

function parseSpeedMultiplier(payload: any) {
  const serviceTier = payload?.service_tier;
  const speed = payload?.speed ?? payload?.metadata?.speed;

  if (serviceTier === "priority" || speed === "fast") {
    return 2;
  }

  return 1;
}

export function computeBillingMultiplier(modelAlias: string, payload: any, baseMultiplier: number) {
  const normalized = modelAlias.toLowerCase();
  let modelMultiplier = baseMultiplier;

  if (normalized === "gpt-5.5") {
    modelMultiplier = 4.5;
  } else if (normalized === "gpt-5.3-codex" || normalized === "gpt-5.4-mini") {
    modelMultiplier = 0.9;
  } else if (normalized === "gpt-5.4") {
    modelMultiplier = 1;
  }

  return modelMultiplier * parseSpeedMultiplier(payload);
}

export async function listEnabledModels() {
  const models = await prisma.modelConfig.findMany({
    where: { enabled: true },
    orderBy: [{ priority: "asc" }, { alias: "asc" }]
  });

  return models;
}

