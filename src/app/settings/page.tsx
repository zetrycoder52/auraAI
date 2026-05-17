import { AppShell } from "@/components/layout/app-shell";
import { SettingsClient } from "@/components/settings/settings-client";
import { requirePageUser } from "@/lib/page-auth";
import { normalizeLocale } from "@/lib/i18n";

export default async function SettingsPage() {
  const user = await requirePageUser();

  return (
    <AppShell user={user}>
      <SettingsClient locale={normalizeLocale(user.language)} />
    </AppShell>
  );
}

