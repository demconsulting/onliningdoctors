import { supabase } from "@/integrations/supabase/client";

export interface FeeSettings {
  id: string;
  name: string;
  description?: string | null;
  is_default: boolean;
  is_active: boolean;
  platform_fee_percent: number;
  processing_fee_percent: number;
  processing_fee_fixed: number;
  fixed_transaction_fee: number;
  vat_enabled: boolean;
  vat_percent: number;
  fee_bearer: string; // 'patient' | 'doctor' | 'platform'
  payout_schedule: string; // 'manual' | 'weekly' | 'monthly'
  minimum_payout: number;
}

export interface FeeBreakdown {
  gross: number;
  platformFee: number;
  processingFee: number;
  fixedFee: number;
  vat: number;
  totalFees: number;
  doctorNet: number;
  patientPays: number;
  settings: FeeSettings;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Resolve the effective fee plan for a given doctor (founding → override → default). */
export async function resolveFeeSettings(doctorProfileId?: string | null): Promise<FeeSettings | null> {
  if (doctorProfileId) {
    const { data: doc } = await supabase
      .from("doctors")
      .select("fee_settings_id, founding_pricing_plan_id, founding_locked, is_founding_doctor")
      .eq("profile_id", doctorProfileId)
      .maybeSingle();
    // Founding pricing wins when locked
    const foundingId = (doc as any)?.is_founding_doctor && (doc as any)?.founding_locked ? (doc as any)?.founding_pricing_plan_id : null;
    const overrideId = foundingId || doc?.fee_settings_id;
    if (overrideId) {
      const { data } = await supabase
        .from("platform_fee_settings")
        .select("*")
        .eq("id", overrideId)
        .eq("is_active", true)
        .maybeSingle();
      if (data) return data as FeeSettings;
    }
  }
  const { data } = await supabase
    .from("platform_fee_settings")
    .select("*")
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();
  return (data as FeeSettings) || null;
}

/** Pure calculator — given a plan and gross amount, derive breakdown. */
export function calculateFees(gross: number, settings: FeeSettings): FeeBreakdown {
  const platformFee = round(gross * (settings.platform_fee_percent / 100));
  const processingFee = round(gross * (settings.processing_fee_percent / 100) + settings.processing_fee_fixed);
  const fixedFee = round(settings.fixed_transaction_fee || 0);
  const vat = settings.vat_enabled ? round((platformFee + processingFee + fixedFee) * (settings.vat_percent / 100)) : 0;
  const totalFees = round(platformFee + processingFee + fixedFee + vat);

  let doctorNet = gross;
  let patientPays = gross;
  if (settings.fee_bearer === "doctor") {
    doctorNet = round(gross - totalFees);
  } else if (settings.fee_bearer === "patient") {
    patientPays = round(gross + totalFees);
  } // platform: doctor receives full gross, patient pays gross

  return { gross: round(gross), platformFee, processingFee, fixedFee, vat, totalFees, doctorNet, patientPays, settings };
}
