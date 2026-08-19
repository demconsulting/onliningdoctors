// Maps country codes to country names used in the LocationSelect component
export const countryCodeToName: Record<string, string> = {
  ZA: "South Africa",
  NG: "Nigeria",
  KE: "Kenya",
  GH: "Ghana",
  TZ: "Tanzania",
  UG: "Uganda",
  EG: "Egypt",
  ET: "Ethiopia",
  RW: "Rwanda",
  US: "United States",
  GB: "United Kingdom",
  IN: "India",
  BW: "Botswana",
  ZW: "Zimbabwe",
  MZ: "Mozambique",
  NA: "Namibia",
  AO: "Angola",
  CD: "Democratic Republic of the Congo",
  CM: "Cameroon",
  CI: "Ivory Coast",
  SN: "Senegal",
  ML: "Mali",
  MG: "Madagascar",
  MW: "Malawi",
  ZM: "Zambia",
};

// Maps country codes to currency info
export const countryCurrency: Record<string, { code: string; symbol: string }> = {
  ZA: { code: "ZAR", symbol: "R" },
  NG: { code: "NGN", symbol: "₦" },
  KE: { code: "KES", symbol: "KSh" },
  GH: { code: "GHS", symbol: "GH₵" },
  TZ: { code: "TZS", symbol: "TSh" },
  UG: { code: "UGX", symbol: "USh" },
  EG: { code: "EGP", symbol: "E£" },
  ET: { code: "ETB", symbol: "Br" },
  RW: { code: "RWF", symbol: "FRw" },
  US: { code: "USD", symbol: "$" },
  GB: { code: "GBP", symbol: "£" },
  IN: { code: "INR", symbol: "₹" },
};

// Reverse lookup: country name -> ISO code
export const countryNameToCode: Record<string, string> = Object.entries(countryCodeToName).reduce(
  (acc, [code, name]) => {
    acc[name.toLowerCase()] = code;
    return acc;
  },
  {} as Record<string, string>,
);

// International dialling codes (used to normalise phone numbers to E.164)
export const countryDialCode: Record<string, string> = {
  ZA: "27",
  NG: "234",
  KE: "254",
  GH: "233",
  TZ: "255",
  UG: "256",
  EG: "20",
  ET: "251",
  RW: "250",
  US: "1",
  GB: "44",
  IN: "91",
  BW: "267",
  ZW: "263",
  MZ: "258",
  NA: "264",
  AO: "244",
  CD: "243",
  CM: "237",
  CI: "225",
  SN: "221",
  ML: "223",
  MG: "261",
  MW: "265",
  ZM: "260",
};
