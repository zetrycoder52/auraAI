import { ProviderType } from "@prisma/client";
import { requireCurrentUser } from "@/lib/current-user";
import { getPaymentProviders } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { handleAppError } from "@/lib/route";

function providerHasKey(type: ProviderType) {
  switch (type) {
    case ProviderType.OPENAI:
      return Boolean(process.env.OPENAI_API_KEY);
    case ProviderType.OPENROUTER:
      return Boolean(process.env.OPENROUTER_API_KEY);
    case ProviderType.ANTHROPIC:
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case ProviderType.GEMINI:
      return Boolean(process.env.GEMINI_API_KEY);
    default:
      return false;
  }
}

function endpointSupported(type: ProviderType, mode: "chat" | "image") {
  if (mode === "image" && type === ProviderType.ANTHROPIC) {
    return false;
  }
  return true;
}

type CapabilityStatus = {
  ready: boolean;
  modelAlias: string | null;
  provider: ProviderType | null;
  message: string;
};

function buildNotReady(mode: "chat" | "image"): CapabilityStatus {
  if (mode === "image") {
    return {
      ready: false,
      modelAlias: null,
      provider: null,
      message: "Image mode is unavailable: configure at least one provider API key in server env."
    };
  }

  return {
    ready: false,
    modelAlias: null,
    provider: null,
    message: "Chat mode is unavailable: configure at least one provider API key in server env."
  };
}

function pickPreferredModels(mode: "chat" | "image") {
  if (mode === "image") {
    return ["gpt-image-2"];
  }

  return ["gpt-5.4", "gpt-5.4-mini", "gpt-5.3-codex", "gpt-5.5"];
}

async function resolveCapability(mode: "chat" | "image"): Promise<CapabilityStatus> {
  const capabilityField = mode === "chat" ? "supportsChat" : "supportsImages";
  const preferredAliases = pickPreferredModels(mode);

  const models = await prisma.modelConfig.findMany({
    where: { enabled: true, [capabilityField]: true },
    orderBy: [{ priority: "asc" }, { alias: "asc" }]
  });

  const byAlias = new Map(models.map((model) => [model.alias, model]));
  const ordered = [
    ...preferredAliases
      .map((alias) => byAlias.get(alias))
      .filter((model): model is NonNullable<typeof model> => Boolean(model)),
    ...models.filter((model) => !preferredAliases.includes(model.alias))
  ];

  for (const model of ordered) {
    const provider = await prisma.provider.findUnique({ where: { type: model.provider } });
    if (!provider || !provider.enabled) continue;
    if (!endpointSupported(provider.type, mode)) continue;
    if (!providerHasKey(provider.type)) continue;

    return {
      ready: true,
      modelAlias: model.alias,
      provider: provider.type,
      message: mode === "image" ? "Image mode is ready." : "Chat mode is ready."
    };
  }

  return buildNotReady(mode);
}

export async function GET() {
  try {
    await requireCurrentUser();

    const providers = await prisma.provider.findMany({
      orderBy: [{ priority: "asc" }, { type: "asc" }]
    });

    const aiProviders = providers.map((provider) => ({
      id: provider.type,
      name: provider.name,
      enabled: provider.enabled,
      configured: providerHasKey(provider.type)
    }));

    const [chat, image] = await Promise.all([resolveCapability("chat"), resolveCapability("image")]);

    return Response.json({
      ai: {
        providers: aiProviders,
        anyConfigured: aiProviders.some((item) => item.enabled && item.configured),
        chat,
        image
      },
      payments: getPaymentProviders()
    });
  } catch (error) {
    return handleAppError(error);
  }
}
