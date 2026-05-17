export type PaymentProviderId = "yoomoney" | "sbp" | "cryptobot" | "heleket" | "lzt";

export type PaymentProvider = {
  id: PaymentProviderId;
  name: string;
  description: string;
  enabled: boolean;
};

export type TopupQuote = {
  amountRub: number;
  bonusPercent: number;
  bonusTokens: number;
  totalTokens: number;
  effectiveRubPerMillion: number;
};

const DEFAULT_YOOMONEY_WALLET = "4100119511697667";

export function getPaymentProviders(): PaymentProvider[] {
  return [
    {
      id: "sbp",
      name: "SBP",
      description: "Система быстрых платежей",
      enabled: Boolean(process.env.SBP_MERCHANT_ID)
    },
    {
      id: "cryptobot",
      name: "CryptoBot",
      description: "USDT / TON / BTC",
      enabled: Boolean(process.env.CRYPTOBOT_TOKEN)
    },
    {
      id: "heleket",
      name: "Heleket",
      description: "Payment gateway",
      enabled: Boolean(process.env.HELEKET_MERCHANT_ID)
    },
    {
      id: "lzt",
      name: "LZT",
      description: "LZT market",
      enabled: Boolean(process.env.LZT_SHOP_ID)
    },
    {
      id: "yoomoney",
      name: "YooMoney",
      description: "Fallback provider",
      enabled: true
    }
  ];
}

export function resolveBonusPercent(amountRub: number) {
  if (amountRub >= 3000) return 19;
  if (amountRub >= 600) return 12;
  if (amountRub >= 150) return 6;
  return 0;
}

export function getTopupQuote(amountRubRaw: number): TopupQuote {
  const amountRub = Math.max(100, Math.floor(amountRubRaw));
  const bonusPercent = resolveBonusPercent(amountRub);

  // Internal economy baseline: ~340k billing tokens per RUB.
  const baseTokens = amountRub * 340_000;
  const bonusTokens = Math.floor(baseTokens * (bonusPercent / 100));
  const totalTokens = baseTokens + bonusTokens;
  const effectiveRubPerMillion = Number((amountRub / (totalTokens / 1_000_000)).toFixed(2));

  return {
    amountRub,
    bonusPercent,
    bonusTokens,
    totalTokens,
    effectiveRubPerMillion
  };
}

export function createPaymentUrl(providerId: PaymentProviderId, amountRub: number, label: string) {
  if (providerId !== "yoomoney") {
    return null;
  }

  const wallet = process.env.YOOMONEY_WALLET || DEFAULT_YOOMONEY_WALLET;
  const target = encodeURIComponent("AuraAI token top-up");
  const quickPayLabel = encodeURIComponent(label);
  const sum = encodeURIComponent(String(amountRub));
  const receiver = encodeURIComponent(wallet);

  return `https://yoomoney.ru/quickpay/confirm.xml?receiver=${receiver}&quickpay-form=shop&targets=${target}&sum=${sum}&label=${quickPayLabel}&paymentType=SB`;
}
