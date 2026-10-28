import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  MEDICAL_AID_CONSENT_TEXT, consentTimestamp, emptyMedicalAidForm, validateMedicalAidForm, type MedicalAidForm,
} from "@/lib/medicalAid";

const db = supabase as any;

const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  unverified: "secondary", verified: "default", failed: "destructive", expired: "outline",
};

const toForm = (row: any): MedicalAidForm => row ? {
  scheme_name: row.scheme_name || "", plan: row.plan || "", membership_number: row.membership_number || "",
  dependent_code: row.dependent_code || "", is_main_member: row.is_main_member ?? true,
  main_member_name: row.main_member_name || "", main_member_id_number: row.main_member_id_number || "",
  main_member_dob: row.main_member_dob || "", consent_to_share_with_scheme: !!row.consent_to_share_with_scheme,
} : emptyMedicalAidForm();

export const MedicalAidFields = ({ form, setForm, schemes, idPrefix }: {
  form: MedicalAidForm; setForm: (f: MedicalAidForm) => void; schemes: string[]; idPrefix: string;
}) => {
  const set = (patch: Partial<MedicalAidForm>) => setForm({ ...form, ...patch });
  const options = form.scheme_name && !schemes.includes(form.scheme_name) ? [form.scheme_name, ...schemes] : schemes;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Medical scheme *</Label>
          <Select value={form.scheme_name} onValueChange={(v) => set({ scheme_name: v })}>
            <SelectTrigger><SelectValue placeholder="Select scheme" /></SelectTrigger>
            <SelectContent>{options.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Plan</Label><Input value={form.plan} maxLength={80} onChange={(e) => set({ plan: e.target.value })} /></div>
        <div><Label>Membership number *</Label><Input value={form.membership_number} maxLength={40} onChange={(e) => set({ membership_number: e.target.value })} /></div>
        <div><Label>Dependant code</Label><Input value={form.dependent_code} maxLength={20} onChange={(e) => set({ dependent_code: e.target.value })} /></div>
      </div>
      <div className="flex items-center gap-2">
        <Switch id={`${idPrefix}-main`} checked={form.is_main_member} onCheckedChange={(v) => set({ is_main_member: v })} />
        <Label htmlFor={`${idPrefix}-main`}>This person is the main member</Label>
      </div>
      {!form.is_main_member && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label>Main member name *</Label><Input value={form.main_member_name} maxLength={120} onChange={(e) => set({ main_member_name: e.target.value })} /></div>
          <div><Label>Main member ID number *</Label><Input value={form.main_member_id_number} maxLength={20} onChange={(e) => set({ main_member_id_number: e.target.value })} /></div>
          <div><Label>Main member date of birth *</Label><Input type="date" value={form.main_member_dob} onChange={(e) => set({ main_member_dob: e.target.value })} /></div>
        </div>
      )}
      <div className="flex items-start gap-2 rounded-md border border-border p-3">
        <Checkbox id={`${idPrefix}-consent`} checked={form.consent_to_share_with_scheme}
          onCheckedChange={(v) => set({ consent_to_share_with_scheme: v === true })} />
        <Label htmlFor={`${idPrefix}-consent`} className="text-sm font-normal leading-snug">{MEDICAL_AID_CONSENT_TEXT} *</Label>
      </div>
    </div>
  );
};

export const useMedicalSchemes = () => {
  const [schemes, setSchemes] = useState<string[]>([]);
  useEffect(() => {
    db.from("medical_schemes").select("name").eq("is_active", true).order("name")
      .then(({ data }: any) => setSchemes((data || []).map((s: any) => s.name)));
  }, []);
  return schemes;
};

/** Upsert the saved row for the patient (dependentId null) or a dependant. */
export async function saveMedicalAid(patientId: string, dependentId: string | null, form: MedicalAidForm, existing: any) {
  const payload = {
    patient_id: patientId, dependent_id: dependentId,
    scheme_name: form.scheme_name.trim(), plan: form.plan.trim() || null,
    membership_number: form.membership_number.trim(), dependent_code: form.dependent_code.trim() || null,
    is_main_member: form.is_main_member,
    main_member_name: form.is_main_member ? null : form.main_member_name.trim(),
    main_member_id_number: form.is_main_member ? null : form.main_member_id_number.trim(),
    main_member_dob: form.is_main_member ? null : form.main_member_dob || null,
    consent_to_share_with_scheme: form.consent_to_share_with_scheme,
    consent_given_at: consentTimestamp(form.consent_to_share_with_scheme, existing?.consent_given_at),
  };
  return existing?.id
    ? db.from("patient_medical_aid").update(payload).eq("id", existing.id).select().single()
    : db.from("patient_medical_aid").insert(payload).select().single();
}

const Section = ({ title, patientId, dependentId, row, schemes, onSaved }: any) => {
  const { toast } = useToast();
  const [form, setForm] = useState<MedicalAidForm>(toForm(row));
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(toForm(row)), [row]);

  const save = async () => {
    const err = validateMedicalAidForm(form);
    if (err) { toast({ variant: "destructive", title: err }); return; }
    setSaving(true);
    const { error } = await saveMedicalAid(patientId, dependentId, form, row);
    setSaving(false);
    if (error) { toast({ variant: "destructive", title: "Could not save", description: error.message }); return; }
    toast({ title: "Medical aid details saved" });
    onSaved();
  };
  const remove = async () => {
    if (!row?.id) return;
    const { error } = await db.from("patient_medical_aid").delete().eq("id", row.id);
    if (error) { toast({ variant: "destructive", title: "Could not remove", description: error.message }); return; }
    onSaved();
  };
  const status = row?.verification_status || "unverified";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          {row && <Badge variant={STATUS_TONE[status]} className="capitalize">{status}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <MedicalAidFields form={form} setForm={setForm} schemes={schemes} idPrefix={dependentId || "self"} />
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
          {row && <Button variant="ghost" onClick={remove} className="gap-2"><Trash2 className="h-4 w-4" /> Remove</Button>}
        </div>
      </CardContent>
    </Card>
  );
};

const MedicalAidDetails = ({ user }: { user: User }) => {
  const schemes = useMedicalSchemes();
  const [rows, setRows] = useState<any[]>([]);
  const [dependents, setDependents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: r }, { data: d }] = await Promise.all([
      db.from("patient_medical_aid").select("*").eq("patient_id", user.id),
      supabase.from("dependents").select("id, full_name, relationship").eq("guardian_id", user.id).order("full_name"),
    ]);
    setRows(r || []); setDependents(d || []); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user.id]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <CardDescription>
        Save your medical aid details once so they're ready when you book a medical aid consultation. Details stay unverified until checked with your scheme.
      </CardDescription>
      <Section title="My medical aid" patientId={user.id} dependentId={null}
        row={rows.find((r) => !r.dependent_id)} schemes={schemes} onSaved={load} />
      {dependents.map((d) => (
        <Section key={d.id} title={`${d.full_name} (${d.relationship})`} patientId={user.id} dependentId={d.id}
          row={rows.find((r) => r.dependent_id === d.id)} schemes={schemes} onSaved={load} />
      ))}
    </div>
  );
};

export default MedicalAidDetails;
