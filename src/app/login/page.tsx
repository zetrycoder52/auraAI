import { LoginForm } from "@/components/auth/login-form";
import { getPublicLocale } from "@/lib/locale";

export default async function LoginPage() {
  const locale = await getPublicLocale();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <LoginForm locale={locale} />
    </main>
  );
}

