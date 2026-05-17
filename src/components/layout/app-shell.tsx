import type { ReactNode } from "react";
import type { User } from "@prisma/client";
import { MainNav } from "@/components/layout/main-nav";
import { normalizeLocale } from "@/lib/i18n";

type AppShellProps = {
  user: User;
  children: ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  const locale = normalizeLocale(user.language);
  const navItems = [
    { href: "/dashboard", id: "dashboard" as const },
    { href: "/image", id: "image" as const },
    { href: "/instructions", id: "instructions" as const },
    { href: "/settings", id: "settings" as const }
  ];

  return (
    <div className="min-h-screen">
      <MainNav items={navItems} userEmail={user.email} locale={locale} isAdmin={user.role === "ADMIN"} />
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 md:px-6">{children}</main>
    </div>
  );
}
