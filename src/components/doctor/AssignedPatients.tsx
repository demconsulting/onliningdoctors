import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { logMedicalAccess } from "@/lib/medicalAudit";

interface Assigned { patient_id: string; full_name: string | null; email: string | null; phone: string | null; assigned_at: string; }
type Detail = Record<string, string | number | null>;

const FIELDS: [string, string][] = [
  ["email", "Email"], ["phone", "Phone"], ["date_of_birth", "Date of birth"], ["gender", "Gender"],
  ["city", "City"], ["country", "Country"], ["blood_type", "Blood type"], ["allergies", "Allergies"],
  ["chronic_conditions", "Chronic conditions"], ["current_medications", "Current medications"],
  ["height_cm", "Height (cm)"], ["weight_kg", "Weight (kg)"],
  ["emergency_contact_name", "Emergency contact"], ["emergency_contact_phone", "Emergency phone"],
];

const AssignedPatients = ({ user }: { user: User }) => {
  const [items, setItems] = useState<Assigned[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    (supabase.rpc as any)("get_my_assigned_patients").then(({ data, error }: any) => {
      if (error) toast({ variant: "destructive", title: "Error", description: error.message });
      setItems(data || []);
      setLoading(false);
    });
  }, [toast]);

  const openPatient = async (p: Assigned) => {
    setOpeningId(p.patient_id);
    try {
      // Audit entry is written BEFORE any patient data is fetched or displayed.
      await logMedicalAccess(user.id, p.patient_id, "READ", "MEDICAL_RECORD");
      const { data, error } = await (supabase.rpc as any)("get_assigned_patient_detail", { _patient_id: p.patient_id });
      if (error) throw error;
      setDetail(data as Detail);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Cannot open patient", description: e.message });
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">My Assigned Patients</CardTitle>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Every time you open a patient record, it is logged for compliance.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No patients have been assigned to you yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.patient_id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{p.full_name || "Unnamed patient"}</p>
                  <p className="text-xs text-muted-foreground">Assigned {new Date(p.assigned_at).toLocaleDateString()}</p>
                </div>
                <Button size="sm" variant="outline" disabled={openingId === p.patient_id} onClick={() => openPatient(p)}>
                  {openingId === p.patient_id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} View
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader><SheetTitle className="font-display">{detail?.full_name || "Patient"}</SheetTitle></SheetHeader>
          <dl className="mt-6 space-y-3 text-sm">
            {FIELDS.map(([k, label]) => (
              <div key={k}>
                <dt className="font-semibold text-foreground">{label}</dt>
                <dd className="whitespace-pre-wrap text-muted-foreground">{detail?.[k] ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </SheetContent>
      </Sheet>
    </Card>
  );
};

export default AssignedPatients;
