import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "READ" | "UPDATE" | "DELETE" | "CREATE";
export type AuditRecordType = "MEDICAL_RECORD" | "PRESCRIPTION" | "DOCUMENT" | "PROFILE";

/** Writes an audit entry. Throws if it fails, so callers must not show patient data on error. */
export async function logMedicalAccess(actorId: string, patientId: string, action: AuditAction, recordType: AuditRecordType) {
  const { error } = await (supabase.from as any)("medical_audit_logs").insert({
    actor_id: actorId,
    target_patient_id: patientId,
    action_type: action,
    record_type: recordType,
  });
  if (error) throw new Error(`Audit logging failed: ${error.message}`);
}
