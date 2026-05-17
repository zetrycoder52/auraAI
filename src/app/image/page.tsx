import { AppShell } from "@/components/layout/app-shell";
import { ImageClient } from "@/components/image/image-client";
import { requirePageUser } from "@/lib/page-auth";
import { normalizeLocale } from "@/lib/i18n";

export default async function ImagePage() {
  const user = await requirePageUser();

  return (
    <AppShell user={user}>
      <ImageClient locale={normalizeLocale(user.language)} />
    </AppShell>
  );
}

