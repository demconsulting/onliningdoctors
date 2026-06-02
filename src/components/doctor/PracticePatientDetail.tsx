import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2 } from "lucide-react";
import type { PracticePatient } from "./PracticePatients";

interface Props {
  patient: PracticePatient | null;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}

interface OnlineAppt {
  id: string; scheduled_at: string; status: string; reason: string | null;
}

const PracticePatientDetail = ({ patient, onOpenChange }: Props) => {
  const [appts, setAppts] = useState<OnlineAppt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patient?.linked_user_id) { setAppts([]); return; }
    setLoading(true);
    supabase
      .from("appointments")
      .select("id, scheduled_at, status, reason")
      .eq("patient_id", patient.linked_user_id)
      .order("scheduled_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { setAppts((data as OnlineAppt[]) || []); setLoading(false); });
  }, [patient]);

  if (!patient) return null;

  return (
    <Sheet open={!!patient} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center gap-2">
            {patient.full_name}
            {patient.linked_user_id && patient.consent_status === "granted" && (
              <Badge className="gap-1"><Link2 className="h-3 w-3" /> Linked</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5 text-sm">
          <section>
            <h4 className="font-semibold text-foreground">Contact</h4>
            <p className="text-muted-foreground">{patient.phone || "—"} · {patient.email || "—"}</p>
            <p className="text-muted-foreground">DOB: {patient.date_of_birth || "—"} · Gender: {patient.gender || "—"}</p>
            {patient.id_last_four && (
              <p className="text-muted-foreground">{patient.id_type === "passport" ? "Passport" : "ID"} •••{patient.id_last_four} ({patient.id_country_code || "—"})</p>
            )}
          </section>

          <section>
            <h4 className="font-semibold text-foreground">Offline Medical History</h4>
            <p className="whitespace-pre-wrap text-muted-foreground"><strong>Allergies:</strong> {patient.allergies || "—"}</p>
            <p className="whitespace-pre-wrap text-muted-foreground"><strong>Chronic:</strong> {patient.chronic_conditions || "—"}</p>
            <p className="whitespace-pre-wrap text-muted-foreground"><strong>Notes:</strong> {patient.medical_notes || "—"}</p>
          </section>

          <section>
            <h4 className="font-semibold text-foreground">Online Appointments</h4>
            {!patient.linked_user_id ? (
              <p className="text-muted-foreground">Not yet linked to a Doctors Onlining account.</p>
            ) : loading ? (
              <div className="flex py-4 justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : appts.length === 0 ? (
              <p className="text-muted-foreground">No online appointments yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {appts.map((a) => (
                  <li key={a.id} className="rounded border border-border p-2">
                    <div className="flex justify-between"><span>{new Date(a.scheduled_at).toLocaleString()}</span><Badge variant="outline">{a.status}</Badge></div>
                    {a.reason && <p className="mt-1 text-xs text-muted-foreground">{a.reason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PracticePatientDetail;
