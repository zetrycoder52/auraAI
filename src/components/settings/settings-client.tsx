"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Lock, ShieldCheck, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cookieLocaleHeader, type Locale, getCopy } from "@/lib/i18n";

type SessionInfo = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  tokenBalance: number;
  language: Locale;
  theme: "light" | "dark";
};

type SettingsClientProps = {
  locale: Locale;
};

export function SettingsClient({ locale }: SettingsClientProps) {
  const t = getCopy(locale);
  const { setTheme } = useTheme();

  const [language, setLanguage] = useState<Locale>("ru");
  const [themeValue, setThemeValue] = useState<"light" | "dark">("light");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [settingsRes, sessionRes] = await Promise.all([
          fetch("/api/settings", { cache: "no-store" }),
          fetch("/api/auth/session", { cache: "no-store" })
        ]);

        if (!settingsRes.ok || !sessionRes.ok) {
          throw new Error("Failed to load settings");
        }

        const settingsJson = await settingsRes.json();
        const sessionJson = await sessionRes.json();

        setLanguage(settingsJson?.settings?.language ?? "ru");
        setThemeValue(settingsJson?.settings?.theme ?? "light");
        setTelegramHandle(settingsJson?.settings?.telegramHandle ?? "");
        setSession(sessionJson?.user ?? null);
        setTheme(settingsJson?.settings?.theme ?? "light");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [setTheme]);

  async function onSaveSettings(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language, theme: themeValue, telegramHandle })
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(json?.error?.message ?? "Save failed");
      }

      document.cookie = cookieLocaleHeader(language);
      setTheme(themeValue);
      setStatus("Saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordLoading(true);
    setStatus(null);

    try {
      const formData = new FormData(event.currentTarget);
      const newPassword = String(formData.get("newPassword") ?? "");
      const repeatPassword = String(formData.get("repeatPassword") ?? "");
      if (newPassword !== repeatPassword) {
        throw new Error(t.auth.passwordMismatch);
      }

      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.get("currentPassword"),
          newPassword
        })
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error?.message ?? "Password change failed");
      }

      setStatus("Password updated");
      event.currentTarget.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Password change failed");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function onResetApiKey() {
    setResetLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/settings/reset-api-key", { method: "POST" });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error?.message ?? "API key reset failed");
      }

      setNewKey(json?.rawKey ?? null);
      setStatus("API key reset completed");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "API key reset failed");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <section className="space-y-6 pb-6">
      <header>
        <h1 className="text-4xl font-black tracking-tight">{t.settings.title}</h1>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t.settings.account}
            </CardTitle>
            <CardDescription>{t.settings.changePassword}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="grid gap-3 md:grid-cols-2" onSubmit={onSaveSettings}>
              <div className="space-y-2">
                <Label>{t.settings.language}</Label>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as Locale)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="ru">RU</option>
                  <option value="en">EN</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>{t.settings.theme}</Label>
                <select
                  value={themeValue}
                  onChange={(event) => setThemeValue(event.target.value as "light" | "dark")}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>{t.settings.telegram}</Label>
                <Input
                  value={telegramHandle}
                  onChange={(event) => setTelegramHandle(event.target.value)}
                  placeholder="@username"
                />
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "..." : t.settings.saveProfile}
                </Button>
              </div>
            </form>

            <form className="grid gap-3 md:grid-cols-2" onSubmit={onChangePassword}>
              <div className="space-y-2 md:col-span-2">
                <Label>{t.settings.currentPassword}</Label>
                <Input name="currentPassword" type="password" required minLength={8} />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.newPassword}</Label>
                <Input name="newPassword" type="password" required minLength={8} />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.repeatPassword}</Label>
                <Input name="repeatPassword" type="password" required minLength={8} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" className="rounded-full px-6" disabled={passwordLoading}>
                  <Lock className="mr-2 h-4 w-4" />
                  {passwordLoading ? "..." : t.settings.updatePassword}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                {t.settings.apiKeyInfo}
              </CardTitle>
              <CardDescription>{t.settings.resetKeyHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" onClick={onResetApiKey} disabled={resetLoading}>
                {resetLoading ? "..." : t.settings.resetKey}
              </Button>
              {newKey ? <p className="rounded-xl border border-border/70 bg-card/80 p-2 font-mono text-xs">{newKey}</p> : null}
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                {t.settings.sessionInfo}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {loading ? (
                <>
                  <Skeleton className="h-5 w-5/6" />
                  <Skeleton className="h-5 w-4/6" />
                  <Skeleton className="h-5 w-3/6" />
                </>
              ) : (
                <>
                  <p>
                    <span className="text-muted-foreground">{t.settings.sessionEmail}: </span>
                    <strong>{session?.email ?? "-"}</strong>
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t.settings.sessionRole}: </span>
                    <strong>{session?.role ?? "-"}</strong>
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t.settings.sessionBalance}: </span>
                    <strong>{(session?.tokenBalance ?? 0).toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}</strong>
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </section>
  );
}
