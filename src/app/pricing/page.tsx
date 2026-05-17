import { PricingPage } from "@/components/marketing/pricing-page";
import { getPublicLocale } from "@/lib/locale";

export default async function Pricing() {
  const locale = await getPublicLocale();
  return <PricingPage initialLocale={locale} />;
}

