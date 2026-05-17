import { AppShell } from "@/components/layout/app-shell";
import { AdminClient } from "@/components/admin/admin-client";
import { requirePageAdmin } from "@/lib/page-auth";

export default async function AdminPage() {
  const user = await requirePageAdmin();

  return (
    <AppShell user={user}>
      <AdminClient />
    </AppShell>
  );
}

