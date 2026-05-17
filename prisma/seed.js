const { PrismaClient, ProviderType, UserRole } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@auraai.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.ADMIN },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      tokenBalance: BigInt(1_000_000)
    }
  });

  const providers = [
    { type: ProviderType.OPENAI, name: "OpenAI", baseUrl: "https://api.openai.com/v1", priority: 10 },
    { type: ProviderType.OPENROUTER, name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", priority: 20 },
    { type: ProviderType.ANTHROPIC, name: "Anthropic", baseUrl: "https://api.anthropic.com", priority: 30 },
    { type: ProviderType.GEMINI, name: "Gemini", baseUrl: "https://generativelanguage.googleapis.com", priority: 40 }
  ];

  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { type: provider.type },
      update: {
        name: provider.name,
        baseUrl: provider.baseUrl,
        priority: provider.priority,
        enabled: true
      },
      create: {
        type: provider.type,
        name: provider.name,
        baseUrl: provider.baseUrl,
        priority: provider.priority,
        enabled: true
      }
    });
  }

  const models = [
    {
      alias: "gpt-5.3-codex",
      provider: ProviderType.OPENAI,
      providerModelId: "gpt-5.3-codex",
      priceMultiplier: "0.9000",
      maxTokens: 32768,
      priority: 10,
      supportsChat: true,
      supportsEmbeds: false,
      supportsImages: false
    },
    {
      alias: "gpt-5.4",
      provider: ProviderType.OPENAI,
      providerModelId: "gpt-5.4",
      priceMultiplier: "1.0000",
      maxTokens: 65536,
      priority: 10,
      supportsChat: true,
      supportsEmbeds: false,
      supportsImages: false
    },
    {
      alias: "gpt-5.4-mini",
      provider: ProviderType.OPENAI,
      providerModelId: "gpt-5.4-mini",
      priceMultiplier: "0.9000",
      maxTokens: 65536,
      priority: 10,
      supportsChat: true,
      supportsEmbeds: true,
      supportsImages: false
    },
    {
      alias: "gpt-5.5",
      provider: ProviderType.OPENAI,
      providerModelId: "gpt-5.5",
      priceMultiplier: "4.5000",
      maxTokens: 131072,
      priority: 10,
      supportsChat: true,
      supportsEmbeds: false,
      supportsImages: false
    },
    {
      alias: "gpt-image-2",
      provider: ProviderType.OPENAI,
      providerModelId: "gpt-image-2",
      priceMultiplier: "2.0000",
      maxTokens: 8192,
      priority: 10,
      supportsChat: false,
      supportsEmbeds: false,
      supportsImages: true
    }
  ];

  for (const model of models) {
    await prisma.modelConfig.upsert({
      where: { alias: model.alias },
      update: model,
      create: model
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

