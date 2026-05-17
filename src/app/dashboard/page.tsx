import { AppShell } from "@/components/layout/app-shell";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { requirePageUser } from "@/lib/page-auth";
import { normalizeLocale } from "@/lib/i18n";

export default async function DashboardPage() {
  const user = await requirePageUser();

  return (
    <AppShell user={user}>
      <DashboardClient locale={normalizeLocale(user.language)} isAdmin={user.role === "ADMIN"} currentUserId={user.id} />
    </AppShell>
  );
}

