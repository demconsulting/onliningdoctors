import { supabase } from "@/integrations/supabase/client";

export const DUPLICATE_IDENTITY_MESSAGE =
  "An account or HPCSA number with these details already exists.";

export interface DoctorIdentityCheck {
  emailTaken: boolean;
  hpcsaTaken: boolean;
}

/**
 * Checks the strict 1:1 binding between a doctor's email address and their
 * HPCSA registration number before registering or updating a profile.
 */
export const checkDoctorIdentity = async (
  email?: string | null,
  hpcsa?: string | null,
  excludeUserId?: string | null
): Promise<DoctorIdentityCheck> => {
  const { data, error } = await supabase.rpc("check_doctor_identity_available", {
    _email: email?.trim() || null,
    _hpcsa: hpcsa?.trim() || null,
    _exclude_user: excludeUserId || null,
  });
  if (error) {
    console.error("identity check failed", error);
    return { emailTaken: false, hpcsaTaken: false };
  }
  const result = (data ?? {}) as { email_taken?: boolean; hpcsa_taken?: boolean };
  return { emailTaken: !!result.email_taken, hpcsaTaken: !!result.hpcsa_taken };
};
