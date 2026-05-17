"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, Cpu } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { type Locale, cookieLocaleHeader, getCopy } from "@/lib/i18n";

const plans = [
  {
    key: "start",
    price: "150 ₽",
    tokensRu: "~51 млн токенов",
    tokensEn: "~51M tokens",
    rate: "~2.94 ₽ / 1M"
  },
  {
    key: "base",
    price: "600 ₽",
    tokensRu: "~250 млн токенов",
    tokensEn: "~250M tokens",
    rate: "~2.40 ₽ / 1M",
    highlighted: true
  },
  {
    key: "pro",
    price: "3000 ₽",
    tokensRu: "~1.6 млрд токенов",
    tokensEn: "~1.6B tokens",
    rate: "~1.88 ₽ / 1M"
  }
];

type PricingPageProps = {
  initialLocale: Locale;
};

export function PricingPage({ initialLocale }: PricingPageProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = getCopy(locale);

  function onLocaleChange(next: Locale) {
    setLocale(next);
    document.cookie = cookieLocaleHeader(next);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1240px] px-4 pb-16 pt-8 md:px-6">
      <header className="surface-glass flex items-center justify-between rounded-[28px] px-4 py-3">
        <Link href="/" className="text-2xl font-bold">
          aura.ai
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle locale={locale} onChange={onLocaleChange} />
          <ThemeToggle />
          <Button asChild className="rounded-full px-5">
            <Link href="/dashboard">{t.common.openCabinet}</Link>
          </Button>
        </div>
      </header>

      <section className="pt-14">
        <p className="text-center text-xs font-semibold tracking-[0.26em] text-primary">{t.nav.pricing.toUpperCase()}</p>
        <h1 className="mx-auto mt-3 max-w-5xl text-center text-4xl font-black leading-tight md:text-6xl">
          {t.landing.plansTitle}
        </h1>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.key}
              className={`premium-card p-7 transition hover:-translate-y-1 hover:shadow-2xl ${plan.highlighted ? "glow-border border-primary/30" : ""}`}
            >
              <p className="text-xs font-semibold tracking-[0.22em] text-primary/80">{plan.key.toUpperCase()}</p>
              <p className="mt-4 text-5xl font-black">{plan.price}</p>
              <p className="mt-2 text-2xl font-semibold">{locale === "ru" ? plan.tokensRu : plan.tokensEn}</p>
              <p className="mt-1 text-sm text-primary">{plan.rate}</p>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CircleCheck className="h-4 w-4 text-primary" />
                  {locale === "ru" ? "Личный кабинет" : "Private dashboard"}
                </li>
                <li className="flex items-center gap-2">
                  <CircleCheck className="h-4 w-4 text-primary" />
                  {locale === "ru" ? "Логи и биллинг" : "Logs and billing"}
                </li>
                <li className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  {locale === "ru" ? "Поддержка клиентов Codex" : "Codex client integrations"}
                </li>
              </ul>
              <Button className="mt-7 w-full rounded-full">
                {locale === "ru" ? "Пополнить баланс" : "Top up balance"}
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="pt-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-primary">{t.common.faq}</p>
            <h2 className="mt-3 text-4xl font-black leading-tight md:text-6xl">{t.landing.faqTitle}</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {t.landing.faq.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </main>
  );
}
