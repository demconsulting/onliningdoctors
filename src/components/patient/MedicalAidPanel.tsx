import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Send, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface ActiveMedicalAidRequest {
  id: string;
  status: string;
  approved_rate: number | null;
  copayment_amount: number | null;
  scheme_name: string;
}

interface Props {
  patientId: string;
  doctorId: string;
  currencySymbol: string;
  onActiveRequestChange: (req: ActiveMedicalAidRequest | null) => void;
}

const STATUS_LABEL: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Awaiting verification", tone: "secondary" },
  approved: { label: "Approved", tone: "default" },
  rejected: { label: "Rejected", tone: "destructive" },
  copay_requested: { label: "Co-payment required", tone: "default" },
  private_requested: { label: "Private payment requested", tone: "outline" },
  cancelled: { label: "Cancelled", tone: "outline" },
};

const MedicalAidPanel = ({ patientId, doctorId, currencySymbol, onActiveRequestChange }: Props) => {
  const { toast } = useToast();
  const [schemes, setSchemes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scheme, setScheme] = useState("");
  const [plan, setPlan] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [mainMember, setMainMember] = useState("");
  const [dependentCode, setDependentCode] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("doctor_medical_aids").select("*").eq("doctor_id", doctorId).eq("is_active", true).order("scheme_name"),
      supabase.from("medical_aid_requests").select("*").eq("patient_id", patientId).eq("doctor_id", doctorId).order("created_at", { ascending: false }),
    ]);
    setSchemes(s || []);
    setRequests(r || []);
    setLoading(false);

    const active = (r || []).find((row: any) => row.status === "approved" || row.status === "copay_requested");
    onActiveRequestChange(active ? {
      id: active.id, status: active.status,
      approved_rate: active.approved_rate, copayment_amount: active.copayment_amount,
      scheme_name: active.scheme_name,
    } : null);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [doctorId, patientId]);

  // Realtime updates so the patient sees doctor decisions live
  useEffect(() => {
    const ch = supabase
      .channel(`maid-req-${patientId}-${doctorId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "medical_aid_requests",
        filter: `patient_id=eq.${patientId}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [patientId, doctorId]);

  const submit = async () => {
    if (!scheme.trim() || !membershipNumber.trim() || !mainMember.trim()) {
      toast({ variant: "destructive", title: "Please complete required fields" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("medical_aid_requests").insert({
      patient_id: patientId,
      doctor_id: doctorId,
      scheme_name: scheme.trim(),
      plan: plan.trim() || null,
      membership_number: membershipNumber.trim(),
      main_member_name: mainMember.trim(),
      dependent_code: dependentCode.trim() || null,
    });
    setSubmitting(false);
    if (error) { toast({ variant: "destructive", title: "Could not submit", description: error.message }); return; }
    toast({ title: "Verification request sent", description: "We'll notify you once the doctor responds." });
    setScheme(""); setPlan(""); setMembershipNumber(""); setMainMember(""); setDependentCode("");
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("medical_aid_requests").update({ status: "cancelled" }).eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Could not cancel", description: error.message }); return; }
    load();
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const hasPending = requests.some((r: any) => r.status === "pending");
  const active = requests.find((r: any) => r.status === "approved" || r.status === "copay_requested");

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm flex gap-2">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-foreground">Medical aid consultations require verification before booking.</p>
          <p className="text-xs text-muted-foreground mt-0.5">Submit your medical aid details for approval and scheduling.</p>
        </div>
      </div>

      {requests.length > 0 && (
        <div className="space-y-2">
          {requests.map((r: any) => {
            const meta = STATUS_LABEL[r.status] || { label: r.status, tone: "outline" as const };
            const Icon = r.status === "approved" || r.status === "copay_requested" ? CheckCircle2
              : r.status === "rejected" ? XCircle : Clock;
            return (
              <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium truncate">{r.scheme_name}{r.plan ? ` · ${r.plan}` : ""}</span>
                      <Badge variant={meta.tone}>{meta.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Member #: {r.membership_number}</p>
                    {r.status === "approved" && r.approved_rate != null && (
                      <p className="text-xs mt-1">Approved rate: <strong>{currencySymbol}{Number(r.approved_rate).toFixed(2)}</strong></p>
                    )}
                    {r.status === "copay_requested" && (
                      <p className="text-xs mt-1">
                        Co-payment: <strong>{currencySymbol}{Number(r.copayment_amount || 0).toFixed(2)}</strong>
                        {r.approved_rate != null && <> · Consultation: <strong>{currencySymbol}{Number(r.approved_rate).toFixed(2)}</strong></>}
                      </p>
                    )}
                    {r.doctor_notes && <p className="text-xs text-muted-foreground mt-1 italic">"{r.doctor_notes}"</p>}
                  </div>
                  {(r.status === "pending") && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => cancel(r.id)}>Cancel</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasPending && !active && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Medical aid provider *</Label>
              {schemes.length > 0 ? (
                <Select value={scheme} onValueChange={(v) => {
                  setScheme(v);
                  const match = schemes.find((s: any) => s.scheme_name === v);
                  if (match?.plan) setPlan(match.plan);
                }}>
                  <SelectTrigger><SelectValue placeholder="Select scheme" /></SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(schemes.map((s: any) => s.scheme_name))).map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                    <SelectItem value="__other__">Other (type below)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input value={scheme} onChange={(e) => setScheme(e.target.value)} placeholder="e.g. Discovery Health" maxLength={80} />
              )}
              {scheme === "__other__" && (
                <Input className="mt-2" value={plan} onChange={(e) => setScheme(e.target.value)} placeholder="Type provider name" />
              )}
            </div>
            <div>
              <Label>Plan</Label>
              <Input value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="e.g. Classic Saver" maxLength={80} />
            </div>
            <div>
              <Label>Membership number *</Label>
              <Input value={membershipNumber} onChange={(e) => setMembershipNumber(e.target.value)} maxLength={40} />
            </div>
            <div>
              <Label>Main member name *</Label>
              <Input value={mainMember} onChange={(e) => setMainMember(e.target.value)} maxLength={120} />
            </div>
            <div className="sm:col-span-2">
              <Label>Dependent code (optional)</Label>
              <Input value={dependentCode} onChange={(e) => setDependentCode(e.target.value)} maxLength={20} />
            </div>
          </div>
          <Button type="button" onClick={submit} disabled={submitting} className="gap-2 gradient-primary border-0 text-primary-foreground">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Request Verification
          </Button>
        </div>
      )}

      {hasPending && !active && (
        <p className="text-xs text-muted-foreground">Your request is awaiting the doctor's review. You'll be able to pick a time slot once approved.</p>
      )}
    </div>
  );
};

export default MedicalAidPanel;
