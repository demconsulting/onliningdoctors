export const MEDICAL_AID_CONSENT_TEXT =
  "I consent to DoctorsOnlining and the treating practice sharing my membership and consultation details with my medical scheme for claims purposes.";

export type VerificationStatus = "unverified" | "verified" | "failed" | "expired";

/** Consent timestamp: kept when still ticked, set when newly ticked, cleared when unticked. */
export function consentTimestamp(consented: boolean, previous: string | null | undefined, now = new Date()): string | null {
  if (!consented) return null;
  return previous || now.toISOString();
}

export interface MedicalAidForm {
  scheme_name: string;
  plan: string;
  membership_number: string;
  dependent_code: string;
  is_main_member: boolean;
  main_member_name: string;
  main_member_id_number: string;
  main_member_dob: string;
  consent_to_share_with_scheme: boolean;
}

export const emptyMedicalAidForm = (): MedicalAidForm => ({
  scheme_name: "", plan: "", membership_number: "", dependent_code: "",
  is_main_member: true, main_member_name: "", main_member_id_number: "", main_member_dob: "",
  consent_to_share_with_scheme: false,
});

/** Returns an error message, or null when the form can be saved. */
export function validateMedicalAidForm(f: MedicalAidForm): string | null {
  if (!f.scheme_name.trim()) return "Choose your medical scheme";
  if (!f.membership_number.trim()) return "Enter your membership number";
  if (!f.is_main_member) {
    if (!f.main_member_name.trim()) return "Enter the main member's name";
    if (!f.main_member_id_number.trim()) return "Enter the main member's ID number";
    if (!f.main_member_dob) return "Enter the main member's date of birth";
  }
  if (!f.consent_to_share_with_scheme) return "Please tick the consent box";
  return null;
}
