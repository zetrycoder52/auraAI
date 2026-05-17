"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { type Locale, cookieLocaleHeader } from "@/lib/i18n";

type NavPreferencesProps = {
  locale: Locale;
};

export function NavPreferences({ locale }: NavPreferencesProps) {
  const [currentLocale, setCurrentLocale] = useState<Locale>(locale);
  const router = useRouter();

  async function onLocaleChange(next: Locale) {
    setCurrentLocale(next);
    document.cookie = cookieLocaleHeader(next);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language: next })
    }).catch(() => undefined);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <LanguageToggle locale={currentLocale} onChange={onLocaleChange} />
      <ThemeToggle />
    </div>
  );
}

