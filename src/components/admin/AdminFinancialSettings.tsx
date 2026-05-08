import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Star, DollarSign, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calculateFees, type FeeSettings } from "@/lib/feeCalculator";

const BLANK: Omit<FeeSettings, "id"> = {
  name: "",
  description: "",
  is_default: false,
  is_active: true,
  platform_fee_percent: 10,
  processing_fee_percent: 0,
  processing_fee_fixed: 5.5,
  fixed_transaction_fee: 0,
  vat_enabled: false,
  vat_percent: 0,
  fee_bearer: "doctor",
  payout_schedule: "manual",
  minimum_payout: 200,
};

const AdminFinancialSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<FeeSettings[]>([]);
  const [editing, setEditing] = useState<FeeSettings | (Omit<FeeSettings, "id"> & { id?: string }) | null>(null);
  const [open, setOpen] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [plansRes, docsRes] = await Promise.all([
      supabase.from("platform_fee_settings").select("*").order("is_default", { ascending: false }).order("name"),
      supabase.from("doctors").select("id, profile_id, fee_settings_id, profiles:profile_id(full_name)").eq("is_verified", true).order("created_at", { ascending: false }).limit(200),
    ]);
    setPlans((plansRes.data as any) || []);
    setDoctors((docsRes.data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setDoctorPlan = async (doctorId: string, planId: string | null) => {
    const { error } = await supabase.from("doctors").update({ fee_settings_id: planId }).eq("id", doctorId);
    if (error) { toast({ variant: "destructive", title: "Update failed", description: error.message }); return; }
    toast({ title: "Doctor fee plan updated" });
    setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, fee_settings_id: planId } : d));
  };

  const openNew = () => { setEditing({ ...BLANK }); setOpen(true); };
  const openEdit = (p: FeeSettings) => { setEditing({ ...p }); setOpen(true); };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast({ variant: "destructive", title: "Name required" }); return; }
    setSaving(true);
    // If marking default, clear existing defaults first
    if (editing.is_default) {
      await supabase.from("platform_fee_settings").update({ is_default: false }).neq("id", (editing as any).id || "00000000-0000-0000-0000-000000000000");
    }
    const payload = { ...editing };
    let error;
    if ((editing as any).id) {
      ({ error } = await supabase.from("platform_fee_settings").update(payload).eq("id", (editing as any).id));
    } else {
      ({ error } = await supabase.from("platform_fee_settings").insert(payload));
    }
    setSaving(false);
    if (error) { toast({ variant: "destructive", title: "Save failed", description: error.message }); return; }
    toast({ title: "Fee plan saved" });
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (p: FeeSettings) => {
    if (p.is_default) { toast({ variant: "destructive", title: "Can't delete the default plan" }); return; }
    if (!confirm(`Delete fee plan "${p.name}"?`)) return;
    const { error } = await supabase.from("platform_fee_settings").delete().eq("id", p.id);
    if (error) { toast({ variant: "destructive", title: "Delete failed", description: error.message }); return; }
    toast({ title: "Fee plan deleted" });
    load();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Financial Settings</CardTitle>
            <CardDescription>Configure platform fees, processing fees, fixed fees, VAT and payout rules. Assign per-doctor overrides from the doctor's profile.</CardDescription>
          </div>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New Plan</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {plans.map((p) => {
            const ex = calculateFees(297, p);
            return (
              <div key={p.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{p.name}</h3>
                      {p.is_default && <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" />Default</Badge>}
                      {!p.is_active && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Platform <strong className="text-foreground">{p.platform_fee_percent}%</strong></span>
                      <span>Processing <strong className="text-foreground">{p.processing_fee_percent}% + {p.processing_fee_fixed}</strong></span>
                      {p.fixed_transaction_fee > 0 && <span>Fixed <strong className="text-foreground">{p.fixed_transaction_fee}</strong></span>}
                      {p.vat_enabled && <span>VAT <strong className="text-foreground">{p.vat_percent}%</strong></span>}
                      <span>Bearer <strong className="text-foreground capitalize">{p.fee_bearer}</strong></span>
                      <span>Payout <strong className="text-foreground capitalize">{p.payout_schedule}</strong> · min {p.minimum_payout}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                      <Calculator className="h-3 w-3" /> Example R297 → doctor receives <strong className="text-primary">R{ex.doctorNet.toFixed(2)}</strong>{p.fee_bearer === "patient" && <> · patient pays <strong>R{ex.patientPays.toFixed(2)}</strong></>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(p)} disabled={p.is_default}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doctor-specific overrides</CardTitle>
          <CardDescription>Assign a non-default plan (e.g. VIP) to specific doctors. Leave blank to use the default plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {doctors.length === 0 && <p className="text-sm text-muted-foreground">No verified doctors yet.</p>}
          {doctors.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <span className="text-sm font-medium truncate">{d.profiles?.full_name || "Unnamed doctor"}</span>
              <Select
                value={d.fee_settings_id || "__default__"}
                onValueChange={(v) => setDoctorPlan(d.id, v === "__default__" ? null : v)}
              >
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Use default plan</SelectItem>
                  {plans.filter(p => p.is_active).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}{p.is_default ? " (default)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing && (editing as any).id ? "Edit Fee Plan" : "New Fee Plan"}</DialogTitle>
            <DialogDescription>Define how fees are calculated and who pays them.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Plan name *</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Default, VIP, Promo…" />
                </div>
                <div>
                  <Label>Fee bearer</Label>
                  <Select value={editing.fee_bearer} onValueChange={(v) => setEditing({ ...editing, fee_bearer: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doctor">Doctor pays fees (deducted from earnings)</SelectItem>
                      <SelectItem value="patient">Patient pays fees (added on top)</SelectItem>
                      <SelectItem value="platform">Platform absorbs fees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Optional" />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Platform fee %</Label>
                  <Input type="number" min={0} max={100} step={0.1} value={editing.platform_fee_percent}
                    onChange={(e) => setEditing({ ...editing, platform_fee_percent: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Processing fee %</Label>
                  <Input type="number" min={0} max={100} step={0.1} value={editing.processing_fee_percent}
                    onChange={(e) => setEditing({ ...editing, processing_fee_percent: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Processing fixed</Label>
                  <Input type="number" min={0} step={0.01} value={editing.processing_fee_fixed}
                    onChange={(e) => setEditing({ ...editing, processing_fee_fixed: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Fixed transaction fee</Label>
                  <Input type="number" min={0} step={0.01} value={editing.fixed_transaction_fee}
                    onChange={(e) => setEditing({ ...editing, fixed_transaction_fee: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Minimum payout</Label>
                  <Input type="number" min={0} step={1} value={editing.minimum_payout}
                    onChange={(e) => setEditing({ ...editing, minimum_payout: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Payout schedule</Label>
                  <Select value={editing.payout_schedule} onValueChange={(v) => setEditing({ ...editing, payout_schedule: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>VAT</Label>
                    <p className="text-xs text-muted-foreground">Apply VAT on top of platform + processing fees.</p>
                  </div>
                  <Switch checked={editing.vat_enabled} onCheckedChange={(c) => setEditing({ ...editing, vat_enabled: c })} />
                </div>
                {editing.vat_enabled && (
                  <div>
                    <Label>VAT %</Label>
                    <Input type="number" min={0} max={100} step={0.1} value={editing.vat_percent}
                      onChange={(e) => setEditing({ ...editing, vat_percent: parseFloat(e.target.value) || 0 })} />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label>Default plan</Label>
                  <p className="text-xs text-muted-foreground">Used for any doctor without an override.</p>
                </div>
                <Switch checked={editing.is_default} onCheckedChange={(c) => setEditing({ ...editing, is_default: c })} />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive plans aren't visible to doctors or used for new bookings.</p>
                </div>
                <Switch checked={editing.is_active} onCheckedChange={(c) => setEditing({ ...editing, is_active: c })} />
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Calculator className="h-3 w-3" /> Preview (R297 consultation)</p>
                {(() => {
                  const ex = calculateFees(297, { ...(editing as any), id: "preview" } as FeeSettings);
                  return (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Gross</span><span className="text-right text-foreground">R{ex.gross.toFixed(2)}</span>
                      <span>Platform</span><span className="text-right">−R{ex.platformFee.toFixed(2)}</span>
                      <span>Processing</span><span className="text-right">−R{ex.processingFee.toFixed(2)}</span>
                      {ex.fixedFee > 0 && <><span>Fixed</span><span className="text-right">−R{ex.fixedFee.toFixed(2)}</span></>}
                      {ex.vat > 0 && <><span>VAT</span><span className="text-right">−R{ex.vat.toFixed(2)}</span></>}
                      <span className="font-semibold text-foreground">Doctor receives</span><span className="text-right font-semibold text-primary">R{ex.doctorNet.toFixed(2)}</span>
                      {editing.fee_bearer === "patient" && <><span className="font-semibold text-foreground">Patient pays</span><span className="text-right font-semibold">R{ex.patientPays.toFixed(2)}</span></>}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFinancialSettings;
