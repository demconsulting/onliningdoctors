export const COUNTRY_CURRENCY: Record<string, { currency: string; currencySymbol: string }> = {
  ZA: { currency: "ZAR", currencySymbol: "R" },
  NG: { currency: "NGN", currencySymbol: "₦" },
  KE: { currency: "KES", currencySymbol: "KSh" },
  GH: { currency: "GHS", currencySymbol: "GH₵" },
  TZ: { currency: "TZS", currencySymbol: "TSh" },
  UG: { currency: "UGX", currencySymbol: "USh" },
  EG: { currency: "EGP", currencySymbol: "E£" },
  ET: { currency: "ETB", currencySymbol: "Br" },
  RW: { currency: "RWF", currencySymbol: "FRw" },
  US: { currency: "USD", currencySymbol: "$" },
  GB: { currency: "GBP", currencySymbol: "£" },
  IN: { currency: "INR", currencySymbol: "₹" },
  CA: { currency: "CAD", currencySymbol: "C$" },
  AU: { currency: "AUD", currencySymbol: "A$" },
  DE: { currency: "EUR", currencySymbol: "€" },
  FR: { currency: "EUR", currencySymbol: "€" },
};

export function getCurrencySymbol(countryCode?: string | null): string {
  if (!countryCode) return "$";
  const info = COUNTRY_CURRENCY[countryCode.toUpperCase()];
  return info?.currencySymbol || "$";
}
