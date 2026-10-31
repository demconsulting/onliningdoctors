export interface OnboardingDoctor {
  id_document_path?: string | null;
  license_document_path?: string | null;
  consultation_fee?: number | string | null;
  profile?: { avatar_url?: string | null } | null;
}

export function missingItems(doctor: OnboardingDoctor, hasAvailability: boolean): string[] {
  const missing: string[] = [];
  if (!doctor.id_document_path?.trim()) missing.push("ID Copy");
  if (!doctor.license_document_path?.trim()) missing.push("HPCSA Document");
  if (!doctor.profile?.avatar_url?.trim()) missing.push("Profile Photo");
  const fee = Number(doctor.consultation_fee);
  if (!Number.isFinite(fee) || fee <= 0) missing.push("Consultation Fee");
  if (!hasAvailability) missing.push("Availability");
  return missing;
}

export function hasUsableAvailability(rows: { is_available: boolean | null; start_time: string; end_time: string }[]): boolean {
  return rows.some(row => row.is_available === true && row.start_time < row.end_time);
}

export function nextDueReminder<T extends { id: string; delay_minutes: number }>(reminders: T[], sentIds: Set<string>, ageMinutes: number): T | undefined {
  return reminders.find(reminder => ageMinutes >= reminder.delay_minutes && !sentIds.has(reminder.id));
}