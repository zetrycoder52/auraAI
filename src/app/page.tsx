import { LandingPage } from "@/components/marketing/landing-page";
import { getPublicLocale } from "@/lib/locale";

export default async function HomePage() {
  const locale = await getPublicLocale();
  return <LandingPage initialLocale={locale} />;
}

