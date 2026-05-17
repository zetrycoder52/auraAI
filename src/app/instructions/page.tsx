import { AppShell } from "@/components/layout/app-shell";
import { InstructionsClient } from "@/components/instructions/instructions-client";
import { normalizeLocale } from "@/lib/i18n";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";

export default async function InstructionsPage() {
  const user = await requirePageUser();
  const key = await prisma.apiKey.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "asc" }
  });

  const models = await prisma.modelConfig.findMany({
    where: { enabled: true },
    orderBy: [{ priority: "asc" }, { alias: "asc" }],
    select: { alias: true }
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const maskedKey = key ? `${key.prefix}****${key.last4}` : "aura_live_xxxxxxxxx";

  return (
    <AppShell user={user}>
      <InstructionsClient
        locale={normalizeLocale(user.language)}
        appUrl={appUrl}
        providerId="auraai"
        providerName="AuraAI"
        apiKeyMasked={maskedKey}
        models={models.map((item) => item.alias)}
      />
    </AppShell>
  );
}
