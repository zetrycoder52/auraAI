"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { NavPreferences } from "@/components/layout/nav-preferences";
import { Button } from "@/components/ui/button";
import { type Locale, getCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  id: "dashboard" | "image" | "instructions" | "settings";
};

type MainNavProps = {
  items: NavItem[];
  userEmail: string;
  locale: Locale;
  isAdmin?: boolean;
};

export function MainNav({ items, userEmail, locale, isAdmin }: MainNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const labels = getCopy(locale).nav;

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 mb-8 border-b border-border/70 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="truncate text-lg font-semibold">
            AuraAI
          </Link>

          <nav className="hidden items-center gap-1 rounded-2xl border border-border/70 bg-card/65 p-1 md:flex">
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground",
                    active && "text-foreground"
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="active-nav-pill"
                      className="absolute inset-0 -z-10 rounded-xl bg-card shadow-sm"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                    />
                  ) : null}
                  {labels[item.id]}
                </Link>
              );
            })}
            {isAdmin ? (
              <Link
                href="/admin"
                className={cn(
                  "relative rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground",
                  pathname === "/admin" && "text-foreground"
                )}
              >
                {pathname === "/admin" ? (
                  <motion.span
                    layoutId="active-admin-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-card shadow-sm"
                  />
                ) : null}
                Admin
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <NavPreferences locale={locale} />
          <div className="hidden max-w-[240px] text-right lg:block">
            <p className="truncate text-sm font-medium">{userEmail}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-9 rounded-xl" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {labels.logout}
          </Button>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-auto px-4 pb-3 md:hidden">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs",
                active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              )}
            >
              {labels[item.id]}
            </Link>
          );
        })}
        {isAdmin ? (
          <Link
            href="/admin"
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              pathname === "/admin" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            )}
          >
            Admin
          </Link>
        ) : null}
      </div>
    </header>
  );
}
