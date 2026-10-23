export const PRACTICE_TYPES = ["solo", "partnership", "association", "incorporated"] as const;
export const MEMBER_ROLES = ["principal", "partner", "associate"] as const;
export function canAccessGroupPractice(roles: readonly string[]) {
  return roles.some(role => ["practice_admin", "admin", "super_admin", "platform_admin"].includes(role));
}
export function missingDoctorCredentials(doctor: { hpcsa_number?: string | null; individual_bhf_number?: string | null; physical_practice_address?: string | null }) {
  return [!doctor.hpcsa_number?.trim() && "HPCSA", !doctor.individual_bhf_number?.trim() && "Individual BHF", !doctor.physical_practice_address?.trim() && "Physical practice address"].filter((value): value is string => Boolean(value));
}