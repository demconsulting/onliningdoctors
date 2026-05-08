import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Props { user: User; }

const BLANK = { scheme_name: "", plan: "", consultation_rate: 0, default_copayment: 0, requires_authorization: false, is_active: true };

const DoctorMedicalAids = ({ user }: Props) => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("doctor_medical_aids").select("*").eq("doctor_id", user.id).order("scheme_name");
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user.id]);

  const add = async () => {
    if (!draft.scheme_name.trim() || draft.consultation_rate < 0) {
      toast({ variant: "destructive", title: "Scheme name and rate required" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("doctor_medical_aids").insert({ ...draft, doctor_id: user.id });
    setSaving(false);
    if (error) { toast({ variant: "destructive", title: "Could not add", description: error.message }); return; }
    toast({ title: "Medical aid added" });
    setDraft({ ...BLANK }); load();
  };

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("doctor_medical_aids").update(patch).eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Update failed", description: error.message }); return; }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this medical aid?")) return;
    await supabase.from("doctor_medical_aids").delete().eq("id", id);
    load();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display"><ShieldCheck className="h-5 w-5 text-primary" /> Supported Medical Aids</CardTitle>
        <CardDescription>Configure schemes you accept and set per-scheme rates and co-payments. Patients must request verification before booking medical aid consultations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No medical aids added yet.</p>}
        {items.map((it: any) => (
          <div key={it.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[160px]">
                <Label className="text-xs">Scheme</Label>
                <Input defaultValue={it.scheme_name} onBlur={(e) => e.target.value !== it.scheme_name && update(it.id, { scheme_name: e.target.value })} />
              </div>
              <div className="flex-1 min-w-[140px]">
                <Label className="text-xs">Plan</Label>
                <Input defaultValue={it.plan || ""} onBlur={(e) => update(it.id, { plan: e.target.value || null })} />
              </div>
              <div className="w-32">
                <Label className="text-xs">Rate</Label>
                <Input type="number" min={0} step="0.01" defaultValue={it.consultation_rate} onBlur={(e) => update(it.id, { consultation_rate: Number(e.target.value) })} />
              </div>
              <div className="w-32">
                <Label className="text-xs">Co-payment</Label>
                <Input type="number" min={0} step="0.01" defaultValue={it.default_copayment} onBlur={(e) => update(it.id, { default_copayment: Number(e.target.value) })} />
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2">
                <Switch checked={it.requires_authorization} onCheckedChange={(v) => update(it.id, { requires_authorization: v })} />
                Requires authorization
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={it.is_active} onCheckedChange={(v) => update(it.id, { is_active: v })} />
                Active
              </label>
            </div>
          </div>
        ))}

        <div className="rounded-lg border border-dashed border-primary/30 p-3 space-y-2">
          <p className="text-sm font-medium">Add a medical aid</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Scheme name *" value={draft.scheme_name} onChange={(e) => setDraft({ ...draft, scheme_name: e.target.value })} />
            <Input placeholder="Plan (optional)" value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value })} />
            <Input type="number" min={0} step="0.01" placeholder="Consultation rate" value={draft.consultation_rate || ""} onChange={(e) => setDraft({ ...draft, consultation_rate: Number(e.target.value) })} />
            <Input type="number" min={0} step="0.01" placeholder="Default co-payment" value={draft.default_copayment || ""} onChange={(e) => setDraft({ ...draft, default_copayment: Number(e.target.value) })} />
          </div>
          <Button type="button" onClick={add} disabled={saving} className="gap-2"><Plus className="h-4 w-4" /> Add</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DoctorMedicalAids;
