// Maps country names to country codes
const countryNameToCode: Record<string, string> = {
  "South Africa": "ZA",
  "Nigeria": "NG",
  "Kenya": "KE",
  "Ghana": "GH",
  "Tanzania": "TZ",
  "Uganda": "UG",
  "Egypt": "EG",
  "Ethiopia": "ET",
  "Rwanda": "RW",
  "United States": "US",
  "United Kingdom": "GB",
  "India": "IN",
  "Canada": "CA",
  "Australia": "AU",
  "Germany": "DE",
  "France": "FR",
  "Botswana": "BW",
  "Zimbabwe": "ZW",
  "Mozambique": "MZ",
  "Namibia": "NA",
  "Angola": "AO",
  "Democratic Republic of the Congo": "CD",
  "Cameroon": "CM",
  "Ivory Coast": "CI",
  "Senegal": "SN",
  "Mali": "ML",
  "Madagascar": "MG",
  "Malawi": "MW",
  "Zambia": "ZM",
};

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
  BW: { currency: "BWP", currencySymbol: "P" },
  ZW: { currency: "ZWL", currencySymbol: "Z$" },
  MZ: { currency: "MZN", currencySymbol: "MT" },
  NA: { currency: "NAD", currencySymbol: "N$" },
  AO: { currency: "AOA", currencySymbol: "Kz" },
  CD: { currency: "CDF", currencySymbol: "FC" },
  CM: { currency: "XAF", currencySymbol: "FCFA" },
  CI: { currency: "XOF", currencySymbol: "CFA" },
  SN: { currency: "XOF", currencySymbol: "CFA" },
  ML: { currency: "XOF", currencySymbol: "CFA" },
  MG: { currency: "MGA", currencySymbol: "Ar" },
  MW: { currency: "MWK", currencySymbol: "MK" },
  ZM: { currency: "ZMW", currencySymbol: "ZK" },
};

export function getCurrencySymbol(countryInput?: string | null): string {
  if (!countryInput) return "$";
  
  // If input is already a country code (2 chars, uppercase), use it directly
  if (countryInput.length === 2) {
    const info = COUNTRY_CURRENCY[countryInput.toUpperCase()];
    return info?.currencySymbol || "$";
  }
  
  // Otherwise, convert country name to code
  const countryCode = countryNameToCode[countryInput];
  if (countryCode) {
    return COUNTRY_CURRENCY[countryCode]?.currencySymbol || "$";
  }
  
  return "$";
}
