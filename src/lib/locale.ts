import { cookies } from "next/headers";
import { localeCookieName, normalizeLocale, type Locale } from "@/lib/i18n";

export async function getPublicLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(localeCookieName)?.value);
}

