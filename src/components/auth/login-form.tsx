"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Locale, getCopy } from "@/lib/i18n";

type LoginFormProps = {
  locale: Locale;
};

export function LoginForm({ locale }: LoginFormProps) {
  const router = useRouter();
  const t = getCopy(locale);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password")
      })
    });

    if (!response.ok) {
      const json = await response.json().catch(() => null);
      setError(json?.error?.message ?? "Login failed");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="premium-card mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{t.auth.loginTitle}</CardTitle>
        <CardDescription>{t.auth.loginSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t.auth.password}</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.auth.loginLoading : t.auth.loginAction}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t.auth.noAccount}{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              {t.auth.registerLink}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
