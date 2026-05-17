"use client";

import { Button } from "@/components/ui/button";
import { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LanguageToggleProps = {
  locale: Locale;
  onChange: (next: Locale) => void;
  className?: string;
};

export function LanguageToggle({ locale, onChange, className }: LanguageToggleProps) {
  return (
    <div className={cn("inline-flex items-center rounded-xl border border-border/70 bg-card/70 p-1", className)}>
      <Button
        type="button"
        size="sm"
        variant={locale === "ru" ? "secondary" : "ghost"}
        className="h-8 px-3 text-xs"
        onClick={() => onChange("ru")}
      >
        RU
      </Button>
      <Button
        type="button"
        size="sm"
        variant={locale === "en" ? "secondary" : "ghost"}
        className="h-8 px-3 text-xs"
        onClick={() => onChange("en")}
      >
        EN
      </Button>
    </div>
  );
}

