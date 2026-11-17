import { supabase } from "@/integrations/supabase/client";

export interface ConsultationHistoryAppointment {
  status: string;
  scheduled_at: string;
  duration_minutes: number | null;
  end_time?: string | null;
}

export interface HistoryMedication {
  name: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
}

export interface HistoryPrescription {
  id: string;
  diagnosis: string | null;
  clinical_notes: string | null;
  medications: HistoryMedication[];
  pharmacy_notes: string | null;
  warnings: string | null;
  allergies_noted: string | null;
  follow_up_date: string | null;
  status: string;
  cancellation_reason: string | null;
}

export interface HistoryConsultation {
  appointment_id: string;
  scheduled_at: string;
  doctor_name: string | null;
  reason: string | null;
  notes: string | null;
  summary: string | null;
  prescriptions: HistoryPrescription[];
}

export interface ConsultationHistory {
  appointment_id: string;
  dependent_id: string | null;
  access_expires_at: string;
  profile: {
    full_name: string | null;
    date_of_birth: string | null;
    gender: string | null;
    blood_type?: string | null;
    allergies?: string | null;
    chronic_conditions?: string | null;
    current_medications?: string | null;
    medical_notes?: string | null;
  } | null;
  consultations: HistoryConsultation[];
}

// This only controls presentation. The database independently enforces the same window.
export function isConsultationHistoryActive(appointment: ConsultationHistoryAppointment, now = Date.now()) {
  const start = Date.parse(appointment.scheduled_at);
  const end = appointment.end_time
    ? Date.parse(appointment.end_time)
    : start + (appointment.duration_minutes ?? 30) * 60_000;
  return appointment.status === "confirmed" && now >= start - 15 * 60_000 && now < end + 30 * 60_000;
}

export async function loadConsultationHistory(appointmentId: string): Promise<ConsultationHistory> {
  const { data, error } = await supabase.rpc("get_current_consultation_history", {
    _appointment_id: appointmentId,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Unable to load medical history.");
  }
  // The RPC returns an allowlisted JSON document, not direct access to the clinical tables.
  return data as unknown as ConsultationHistory;
}