import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, History, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { loadConsultationHistory, type ConsultationHistory } from "@/lib/consultationHistory";

const PROFILE_FIELDS = [
  ["allergies", "Allergies"],
  ["chronic_conditions", "Chronic conditions"],
  ["current_medications", "Current medications"],
  ["blood_type", "Blood type"],
  ["medical_notes", "Medical notes"],
] as const;

export default function PatientConsultationHistory({ appointmentId }: { appointmentId: string }) {
  const [history, setHistory] = useState<ConsultationHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    let request = 0;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    setHistory(null);
    setLoading(true);
    setError("");

    const refresh = async () => {
      const currentRequest = ++request;
      try {
        const result = await loadConsultationHistory(appointmentId);
        if (disposed || currentRequest !== request) return;
        const remaining = Date.parse(result.access_expires_at) - Date.now();
        if (remaining <= 0) throw new Error("Consultation access has ended.");
        setHistory(result);
        setError("");
        clearTimeout(expiryTimer);
        expiryTimer = setTimeout(() => {
          ++request;
          setHistory(null);
          setError("Medical history access has ended for this consultation.");
        }, remaining);
      } catch {
        if (disposed || currentRequest !== request) return;
        setHistory(null);
        setError("Medical history is unavailable. Access is limited to the treating doctor during the current consultation.");
      } finally {
        if (!disposed && currentRequest === request) setLoading(false);
      }
    };

    void refresh();
    const interval = setInterval(() => void refresh(), 60_000);
    const channel = supabase
      .channel(`consultation-history-${appointmentId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "appointments", filter: `id=eq.${appointmentId}` }, () => {
        // Hide cached history before rechecking authorization after any appointment change.
        setHistory(null);
        setLoading(true);
        void refresh();
      })
      .subscribe();

    return () => {
      disposed = true;
      clearInterval(interval);
      clearTimeout(expiryTimer);
      void supabase.removeChannel(channel);
    };
  }, [appointmentId, attempt]);

  return (
    <section aria-label="Patient medical history" className="min-w-0 border-t border-border pt-4">
      <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <History className="h-4 w-4 shrink-0 text-primary" /> Medical History
      </h2>
      {loading ? (
        <div role="status" className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading medical history…
        </div>
      ) : error ? (
        <div role="alert" className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>
          <Button variant="outline" size="sm" onClick={() => setAttempt(value => value + 1)} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : history ? (
        <div className="max-h-[480px] space-y-4 overflow-y-auto break-words pr-2 text-sm">
          {history.profile && (
            <div>
              <h3 className="mb-2 font-semibold text-foreground">{history.profile.full_name || "Patient"}</h3>
              <dl className="space-y-2">
                {PROFILE_FIELDS.map(([field, label]) => history.profile?.[field] ? (
                  <div key={field}>
                    <dt className="font-medium text-foreground">{label}</dt>
                    <dd className="whitespace-pre-wrap text-muted-foreground">{history.profile[field]}</dd>
                  </div>
                ) : null)}
              </dl>
            </div>
          )}
          <h3 className="font-semibold text-foreground">Previous consultations ({history.consultations.length})</h3>
          {history.consultations.length === 0 && <p className="text-muted-foreground">No previous consultations recorded.</p>}
          {history.consultations.map(consultation => (
            <article key={consultation.appointment_id} className="space-y-3 border-t border-border pt-3">
              <header>
                <p className="font-medium text-foreground">{format(new Date(consultation.scheduled_at), "d MMM yyyy, HH:mm")}</p>
                <p className="text-xs text-muted-foreground">{consultation.doctor_name ? `Dr. ${consultation.doctor_name}` : "Doctor"}</p>
              </header>
              {consultation.reason && <p><span className="font-medium">Reason: </span>{consultation.reason}</p>}
              {consultation.notes && <div><p className="font-medium">Clinical notes</p><p className="whitespace-pre-wrap text-muted-foreground">{consultation.notes}</p></div>}
              {consultation.summary && <div><p className="font-medium">Consultation summary</p><p className="whitespace-pre-wrap text-muted-foreground">{consultation.summary}</p></div>}
              {consultation.prescriptions.map(prescription => (
                <div key={prescription.id} className="space-y-2">
                  <p className="font-medium">Prescription{prescription.status === "cancelled" ? " — cancelled" : ""}</p>
                  {prescription.diagnosis && <p>Diagnosis: {prescription.diagnosis}</p>}
                  {prescription.clinical_notes && <p className="whitespace-pre-wrap text-muted-foreground">{prescription.clinical_notes}</p>}
                  {Array.isArray(prescription.medications) && <ul className="space-y-2">
                    {prescription.medications.map((medication, index) => (
                      <li key={`${prescription.id}-${index}`}>
                        <p className="font-medium">{medication.name}</p>
                        <p className="text-muted-foreground">{[medication.strength || medication.dosage, medication.frequency, medication.duration, medication.quantity && `Qty ${medication.quantity}`].filter(Boolean).join(" · ")}</p>
                        {medication.instructions && <p className="whitespace-pre-wrap text-muted-foreground">{medication.instructions}</p>}
                      </li>
                    ))}
                  </ul>}
                  {prescription.allergies_noted && <p>Allergies noted: {prescription.allergies_noted}</p>}
                  {prescription.warnings && <p className="whitespace-pre-wrap text-destructive">Warnings: {prescription.warnings}</p>}
                  {prescription.pharmacy_notes && <p className="whitespace-pre-wrap text-muted-foreground">Pharmacy notes: {prescription.pharmacy_notes}</p>}
                  {prescription.follow_up_date && <p>Follow-up: {prescription.follow_up_date}</p>}
                  {prescription.cancellation_reason && <p className="text-destructive">Cancellation: {prescription.cancellation_reason}</p>}
                </div>
              ))}
              {!consultation.notes && !consultation.summary && consultation.prescriptions.length === 0 && <p className="text-muted-foreground">No clinical notes or prescriptions recorded.</p>}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}