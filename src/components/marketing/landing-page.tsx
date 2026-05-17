"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Bot, Code2, Computer, Cpu, MonitorSmartphone, Sparkles, TerminalSquare } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { type Locale, cookieLocaleHeader, getCopy } from "@/lib/i18n";

const ideBadges = ["VS Code", "Cursor", "Windsurf", "Zed", "JetBrains", "OpenCode", "OpenClaw"];

const planCards = [
  {
    key: "start",
    price: "150 ₽",
    tokensRu: "~51 млн токенов",
    tokensEn: "~51M tokens",
    rate: "~2.94 ₽ / 1M",
    featuresRu: ["Админ панель", "Отслеживание логов", "Стартовый пакет"],
    featuresEn: ["Dashboard", "Usage logs", "Starter package"]
  },
  {
    key: "base",
    price: "600 ₽",
    tokensRu: "~250 млн токенов",
    tokensEn: "~250M tokens",
    rate: "~2.40 ₽ / 1M",
    featuresRu: ["Все из Start", "Приоритетная поддержка", "Лучшая цена"],
    featuresEn: ["All Start features", "Priority support", "Better pricing"],
    highlighted: true
  },
  {
    key: "pro",
    price: "3000 ₽",
    tokensRu: "~1.6 млрд токенов",
    tokensEn: "~1.6B tokens",
    rate: "~1.88 ₽ / 1M",
    featuresRu: ["Все из Base", "Приоритетный доступ", "Максимальная выгода"],
    featuresEn: ["All Base features", "Priority access", "Maximum savings"]
  }
];

const floatingCards = [
  { icon: Bot, className: "left-[8%] top-[20%]" },
  { icon: TerminalSquare, className: "left-[12%] top-[48%]" },
  { icon: Computer, className: "right-[9%] top-[25%]" },
  { icon: MonitorSmartphone, className: "right-[12%] top-[51%]" }
];

const terminalLines = [
  "bash <(curl -fsSL https://auraai.local/icw) sk-inv-********",
  "provider configured: auraai",
  "models: gpt-5.4, gpt-5.5, gpt-5.3-codex, gpt-image-2"
];

function useTypewriter(text: string) {
  const [length, setLength] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const tick = () => {
        setLength((prev) => {
          if (prev >= text.length) return prev;
          return prev + 1;
        });
      };
      const timer = setInterval(tick, 28);
      setTimeout(() => clearInterval(timer), text.length * 28 + 200);
    }, 800);

    return () => clearTimeout(timeout);
  }, [text]);

  return text.slice(0, length);
}

type LandingPageProps = {
  initialLocale: Locale;
};

export function LandingPage({ initialLocale }: LandingPageProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = getCopy(locale);
  const typed = useTypewriter(terminalLines[0]);

  const featureCards = useMemo(() => t.landing.features, [t]);

  function onLocaleChange(next: Locale) {
    setLocale(next);
    document.cookie = cookieLocaleHeader(next);
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 pb-14 pt-6 md:px-6 md:pt-8">
      <header className="surface-glass sticky top-4 z-30 mx-auto flex w-full items-center justify-between rounded-[28px] px-4 py-3 md:px-5">
        <p className="text-3xl font-bold tracking-tight">aura.ai</p>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="transition hover:text-foreground">
            {t.landing.featuresTitle}
          </a>
          <a href="#pricing" className="transition hover:text-foreground">
            {t.common.openPricing}
          </a>
          <a href="#faq" className="transition hover:text-foreground">
            {t.common.faq}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle locale={locale} onChange={onLocaleChange} />
          <ThemeToggle />
          <Button asChild className="rounded-full px-5">
            <Link href="/dashboard">{t.common.openCabinet}</Link>
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden pt-14 md:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-[-10%] top-8 h-64 w-64 rounded-full bg-blue-200/50 blur-3xl dark:bg-blue-800/40" />
          <div className="absolute right-[-8%] top-14 h-72 w-72 rounded-full bg-indigo-200/45 blur-3xl dark:bg-indigo-700/40" />
          <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-100/35 blur-3xl dark:bg-amber-700/20" />
        </div>

        {floatingCards.map((item, index) => (
          <motion.div
            key={item.className}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index + 0.2, duration: 0.5 }}
            className={`animate-float-slow absolute hidden h-24 w-24 items-center justify-center rounded-[28px] border border-border/70 bg-card/80 text-muted-foreground shadow-xl backdrop-blur md:flex ${item.className}`}
            style={{ animationDelay: `${index * 0.6}s` }}
          >
            <item.icon className="h-10 w-10" />
          </motion.div>
        ))}

        <div className="mx-auto max-w-4xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary"
          >
            {t.landing.badge}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.55 }}
            className="mt-5 text-4xl font-black leading-[1.05] tracking-tight md:text-7xl"
          >
            <span className="gradient-text">{t.landing.headline}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.55 }}
            className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground md:text-2xl"
          >
            {t.landing.subtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/register">{t.landing.ctaPrimary}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8">
              <Link href="/instructions">{t.landing.ctaSecondary}</Link>
            </Button>
          </motion.div>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-2">
            {ideBadges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center rounded-full border border-border/70 bg-card/65 px-4 py-2 text-sm text-muted-foreground"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12 md:mt-16">
        <div className="premium-card mx-auto max-w-4xl overflow-hidden rounded-[32px] border">
          <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            </div>
            <p className="text-xs tracking-[0.28em] text-muted-foreground">TERMINAL</p>
          </div>
          <div className="space-y-4 p-6 font-mono text-sm md:text-base">
            <p className="text-blue-500">auraai-setup@local:~$</p>
            <p>
              {typed}
              <span className="animate-caret">|</span>
            </p>
            <p className="text-emerald-500">{terminalLines[1]}</p>
            <p className="text-muted-foreground">{terminalLines[2]}</p>
          </div>
        </div>
      </section>

      <section id="features" className="pt-16 md:pt-24">
        <h2 className="text-center text-3xl font-bold md:text-5xl">{t.landing.featuresTitle}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {featureCards.map((item, idx) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              className="premium-card p-6 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <p className="text-xs font-semibold tracking-[0.22em] text-primary/80">{item.step}</p>
              <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
            </motion.article>
          ))}
        </div>

        <div className="premium-card mt-8 p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t.landing.privacyTitle}
          </div>
          <h3 className="mt-4 text-3xl font-bold md:text-4xl">{t.landing.privacyTitle}</h3>
          <p className="mt-3 max-w-4xl text-muted-foreground md:text-lg">{t.landing.privacyText}</p>
        </div>
      </section>

      <section id="pricing" className="pt-16 md:pt-24">
        <h2 className="text-center text-3xl font-bold md:text-5xl">{t.landing.plansTitle}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {planCards.map((plan) => (
            <article
              key={plan.key}
              className={`premium-card rounded-[28px] p-7 transition hover:-translate-y-1 hover:shadow-2xl ${plan.highlighted ? "glow-border border-primary/35" : ""}`}
            >
              <p className="text-xs font-semibold tracking-[0.24em] text-primary/80">{plan.key.toUpperCase()}</p>
              <p className="mt-4 text-5xl font-black">{plan.price}</p>
              <p className="mt-3 text-2xl font-semibold">{locale === "ru" ? plan.tokensRu : plan.tokensEn}</p>
              <p className="mt-2 text-sm text-primary">{plan.rate}</p>
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                {(locale === "ru" ? plan.featuresRu : plan.featuresEn).map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full rounded-full">
                <Link href="/register">{t.dashboard.topup}</Link>
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="pt-16 md:pt-24">
        <h2 className="text-3xl font-bold md:text-5xl">{t.landing.howTitle}</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {[
            { title: "01", textRu: "Создаёте аккаунт и API key", textEn: "Create account and API key" },
            { title: "02", textRu: "Подключаете IDE через /v1", textEn: "Connect IDE via /v1" },
            { title: "03", textRu: "Следите за расходом и логами", textEn: "Track billing and logs" }
          ].map((item) => (
            <article key={item.title} className="premium-card p-6">
              <p className="text-xs font-semibold tracking-[0.24em] text-primary">{item.title}</p>
              <p className="mt-3 text-lg font-medium">{locale === "ru" ? item.textRu : item.textEn}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="pt-16 md:pt-24">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-primary">{t.common.faq}</p>
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

      <footer className="mt-20 flex flex-wrap items-center justify-center gap-6 border-t border-border/70 py-8 text-sm text-muted-foreground">
        {t.landing.footer.map((item) => (
          <span key={item}>{item}</span>
        ))}
        <a href="mailto:support@auraai.local" className="inline-flex items-center gap-2 hover:text-foreground">
          <Code2 className="h-4 w-4" />
          support@auraai.local
        </a>
      </footer>
    </main>
  );
}
