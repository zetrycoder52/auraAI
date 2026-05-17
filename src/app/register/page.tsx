import { RegisterForm } from "@/components/auth/register-form";
import { getPublicLocale } from "@/lib/locale";

export default async function RegisterPage() {
  const locale = await getPublicLocale();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <RegisterForm locale={locale} />
    </main>
  );
}

