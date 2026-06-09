import { useMemo, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Save, Download, RotateCcw, CheckCircle2, AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";

const REFERRAL_TYPES = [
  { value: "doctor_to_doctor", label: "Doctor → Doctor" },
  { value: "doctor_to_patient", label: "Doctor → Patient" },
  { value: "patient_to_doctor", label: "Patient → Doctor" },
  { value: "patient_to_patient", label: "Patient → Patient" },
];

const REWARD_BASES = [
  { value: "fixed_amount", label: "Fixed Amount" },
  { value: "pct_platform_fee", label: "% Platform Fee" },
  { value: "pct_consultation_fee", label: "% Consultation Fee" },
  { value: "pct_net_revenue", label: "% Net Revenue" },
];

const DURATIONS = [
  { value: "first_consultation", label: "First Consultation Only" },
  { value: "first_3_consultations", label: "First 3 Consultations" },
  { value: "first_12_months", label: "First 12 Months" },
  { value: "lifetime", label: "Lifetime" },
];

const defaults = {
  consultation_fee: 500,
  platform_fee_percentage: 18,
  processing_fee_percentage: 2.9,
  fixed_processing_fee: 3,
  referral_type: "patient_to_patient",
  reward_basis: "pct_platform_fee" as string,
  reward_percentage: 10,
  fixed_reward_amount: 0,
  reward_duration: "first_consultation",
  monthly_reward_cap: "" as string | number,
  lifetime_reward_cap: "" as string | number,
  notes: "",
};

type State = typeof defaults;

const round2 = (n: number) => Math.round(n * 100) / 100;

const compute = (s: State) => {
  const fee = Number(s.consultation_fee) || 0;
  const platformPct = Number(s.platform_fee_percentage) || 0;
  const procPct = Number(s.processing_fee_percentage) || 0;
  const procFixed = Number(s.fixed_processing_fee) || 0;
  const rewardPct = Number(s.reward_percentage) || 0;
  const fixedReward = Number(s.fixed_reward_amount) || 0;
  const monthlyCap = s.monthly_reward_cap === "" ? null : Number(s.monthly_reward_cap);
  const lifetimeCap = s.lifetime_reward_cap === "" ? null : Number(s.lifetime_reward_cap);

  const platformRevenue = round2(fee * (platformPct / 100));
  const processingFee = round2(fee * (procPct / 100) + procFixed);
  const netRevenue = round2(platformRevenue - processingFee);

  let rawReward = 0;
  switch (s.reward_basis) {
    case "fixed_amount": rawReward = fixedReward; break;
    case "pct_platform_fee": rawReward = platformRevenue * (rewardPct / 100); break;
    case "pct_consultation_fee": rawReward = fee * (rewardPct / 100); break;
    case "pct_net_revenue": rawReward = netRevenue * (rewardPct / 100); break;
  }
  let reward = round2(rawReward);
  let capApplied: string | null = null;
  if (monthlyCap != null && reward > monthlyCap) { reward = round2(monthlyCap); capApplied = "monthly"; }
  if (lifetimeCap != null && reward > lifetimeCap) { reward = round2(lifetimeCap); capApplied = "lifetime"; }

  const keeps = round2(netRevenue - reward);
  const margin = netRevenue === 0 ? 0 : round2((keeps / netRevenue) * 100);

  let status: "green" | "yellow" | "red" = "green";
  const reasons: string[] = [];
  if (reward > netRevenue) { status = "red"; reasons.push("Reward exceeds net platform revenue"); }
  else if (margin < 0) { status = "red"; reasons.push("Negative margin"); }
  else if (margin < 50) { status = "red"; reasons.push("Margin below 50%"); }
  else if (margin < 70) { status = "yellow"; reasons.push("Margin between 50% and 70%"); }

  return { fee, platformRevenue, processingFee, netRevenue, reward, keeps, margin, status, reasons, capApplied };
};

const StatusBadge = ({ status }: { status: "green" | "yellow" | "red" }) => {
  if (status === "green") return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Healthy</Badge>;
  if (status === "yellow") return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Review</Badge>;
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1"><ShieldAlert className="h-3.5 w-3.5" /> Risky</Badge>;
};

const ProfitabilitySimulator = () => {
  const { toast } = useToast();
  const [s, setS] = useState<State>(defaults);
  const [saved, setSaved] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [settings, setSettings] = useState<any[]>([]);
  const [applyTargetId, setApplyTargetId] = useState<string>("");

  const out = useMemo(() => compute(s), [s]);

  const loadSaved = useCallback(async () => {
    const { data } = await supabase
      .from("referral_profitability_simulations" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setSaved((data as any) ?? []);
  }, []);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from("referral_reward_settings")
      .select("id, referrer_type, referred_type, country, reward_type, reward_basis")
      .order("referrer_type");
    setSettings(data ?? []);
  }, []);

  useEffect(() => { loadSaved(); loadSettings(); }, [loadSaved, loadSettings]);

  const set = (k: keyof State, v: any) => setS((prev) => ({ ...prev, [k]: v }));

  const reset = () => setS(defaults);

  const persist = async () => {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(false); toast({ variant: "destructive", title: "Not authenticated" }); return; }
    const payload = {
      admin_user_id: u.user.id,
      referral_type: s.referral_type,
      consultation_fee: Number(s.consultation_fee) || 0,
      platform_fee_percentage: Number(s.platform_fee_percentage) || 0,
      processing_fee_percentage: Number(s.processing_fee_percentage) || 0,
      fixed_processing_fee: Number(s.fixed_processing_fee) || 0,
      reward_basis: s.reward_basis,
      reward_percentage: Number(s.reward_percentage) || 0,
      fixed_reward_amount: Number(s.fixed_reward_amount) || 0,
      reward_duration: s.reward_duration || null,
      monthly_reward_cap: s.monthly_reward_cap === "" ? null : Number(s.monthly_reward_cap),
      lifetime_reward_cap: s.lifetime_reward_cap === "" ? null : Number(s.lifetime_reward_cap),
      platform_revenue: out.platformRevenue,
      processing_fee: out.processingFee,
      net_platform_revenue: out.netRevenue,
      reward_amount: out.reward,
      doctors_onlining_keeps: out.keeps,
      profit_margin_percentage: out.margin,
      risk_status: out.status,
      notes: s.notes || null,
    };
    const { error } = await supabase.from("referral_profitability_simulations" as any).insert(payload);
    setBusy(false);
    if (error) toast({ variant: "destructive", title: "Save failed", description: error.message });
    else { toast({ title: "Simulation saved" }); loadSaved(); }
  };

  const exportCsv = () => {
    const rows = [
      ["Referral Type", s.referral_type],
      ["Reward Basis", s.reward_basis],
      ["Consultation Fee", s.consultation_fee],
      ["Platform Fee %", s.platform_fee_percentage],
      ["Processing Fee %", s.processing_fee_percentage],
      ["Fixed Processing Fee", s.fixed_processing_fee],
      ["Reward %", s.reward_percentage],
      ["Fixed Reward Amount", s.fixed_reward_amount],
      ["Reward Duration", s.reward_duration],
      ["Monthly Cap", s.monthly_reward_cap],
      ["Lifetime Cap", s.lifetime_reward_cap],
      ["Platform Revenue", out.platformRevenue],
      ["Processing Fee", out.processingFee],
      ["Net Platform Revenue", out.netRevenue],
      ["Referral Reward", out.reward],
      ["Doctors Onlining Keeps", out.keeps],
      ["Profit Margin %", out.margin],
      ["Risk Status", out.status],
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `referral-simulation-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const requestApply = () => {
    if (out.status === "red" && (out.margin < 0 || out.reward > out.netRevenue)) {
      setOverrideOpen(true);
    } else {
      setApplyOpen(true);
    }
  };

  const applyToRule = async () => {
    if (!applyTargetId) { toast({ variant: "destructive", title: "Pick a reward rule first" }); return; }
    setBusy(true);
    const patch: any = {
      reward_basis: s.reward_basis,
      reward_percentage: Number(s.reward_percentage) || 0,
      amount: Number(s.fixed_reward_amount) || 0,
      monthly_reward_cap: s.monthly_reward_cap === "" ? null : Number(s.monthly_reward_cap),
      lifetime_reward_cap: s.lifetime_reward_cap === "" ? null : Number(s.lifetime_reward_cap),
    };
    const { error } = await supabase.from("referral_reward_settings").update(patch).eq("id", applyTargetId);
    setBusy(false);
    if (error) toast({ variant: "destructive", title: "Apply failed", description: error.message });
    else { toast({ title: "Applied to reward rule" }); setApplyOpen(false); }
  };

  const confirmOverride = () => {
    if (overrideReason.trim().length < 10) {
      toast({ variant: "destructive", title: "Provide a longer override reason (min 10 chars)" }); return;
    }
    setS((p) => ({ ...p, notes: `${p.notes ? p.notes + "\n" : ""}OVERRIDE: ${overrideReason.trim()}` }));
    setOverrideOpen(false);
    setApplyOpen(true);
  };

  const fmt = (n: number) => `R ${n.toFixed(2)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> Referral Profitability Simulator</CardTitle>
        <CardDescription>Model a reward rule before activating it. Verify Doctors Onlining keeps a healthy margin after the reward is paid out.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Referral Type</Label>
            <Select value={s.referral_type} onValueChange={(v) => set("referral_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REFERRAL_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Consultation Fee (R)</Label>
            <Input type="number" value={s.consultation_fee} onChange={(e) => set("consultation_fee", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Doctor Platform Fee %</Label>
            <Input type="number" value={s.platform_fee_percentage} onChange={(e) => set("platform_fee_percentage", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Processing Fee %</Label>
            <Input type="number" value={s.processing_fee_percentage} onChange={(e) => set("processing_fee_percentage", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fixed Processing Fee (R)</Label>
            <Input type="number" value={s.fixed_processing_fee} onChange={(e) => set("fixed_processing_fee", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reward Basis</Label>
            <Select value={s.reward_basis} onValueChange={(v) => set("reward_basis", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REWARD_BASES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reward Percentage</Label>
            <Input type="number" value={s.reward_percentage} onChange={(e) => set("reward_percentage", e.target.value)} disabled={s.reward_basis === "fixed_amount"} />
          </div>
          <div className="space-y-1.5">
            <Label>Fixed Reward Amount (R)</Label>
            <Input type="number" value={s.fixed_reward_amount} onChange={(e) => set("fixed_reward_amount", e.target.value)} disabled={s.reward_basis !== "fixed_amount"} />
          </div>
          <div className="space-y-1.5">
            <Label>Reward Duration</Label>
            <Select value={s.reward_duration} onValueChange={(v) => set("reward_duration", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Monthly Reward Cap (R)</Label>
            <Input type="number" placeholder="No cap" value={s.monthly_reward_cap} onChange={(e) => set("monthly_reward_cap", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Lifetime Reward Cap (R)</Label>
            <Input type="number" placeholder="No cap" value={s.lifetime_reward_cap} onChange={(e) => set("lifetime_reward_cap", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea rows={2} value={s.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Why are you testing this configuration?" />
        </div>

        {/* Results */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Calculated Outputs</h3>
            <StatusBadge status={out.status} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Consultation Fee" value={fmt(out.fee)} />
            <Stat label="Platform Fee Revenue" value={fmt(out.platformRevenue)} />
            <Stat label="Processing Fee" value={fmt(out.processingFee)} />
            <Stat label="Net Platform Revenue" value={fmt(out.netRevenue)} />
            <Stat label="Referral Reward" value={fmt(out.reward)} hint={out.capApplied ? `${out.capApplied} cap applied` : undefined} />
            <Stat label="Doctors Onlining Keeps" value={fmt(out.keeps)} accent={out.keeps < 0 ? "danger" : "success"} />
            <Stat label="Profit Margin" value={`${out.margin.toFixed(1)}%`} accent={out.status === "green" ? "success" : out.status === "yellow" ? "warning" : "danger"} />
            <Stat label="Risk Status" value={out.status === "green" ? "Healthy" : out.status === "yellow" ? "Review" : "Risky"} accent={out.status === "green" ? "success" : out.status === "yellow" ? "warning" : "danger"} />
          </div>
          {out.reasons.length > 0 && (
            <Alert variant={out.status === "red" ? "destructive" : "default"} className="mt-4">
              <AlertTitle>{out.status === "red" ? "Risky configuration" : "Review recommended"}</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 text-sm">{out.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={persist} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Simulation
          </Button>
          <Button variant="secondary" onClick={requestApply} className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Apply to Reward Rule
          </Button>
          <Button variant="outline" onClick={exportCsv} className="gap-1.5">
            <Download className="h-4 w-4" /> Export Simulation
          </Button>
          <Button variant="ghost" onClick={reset} className="gap-1.5">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>

        {/* Saved simulations */}
        {saved.length > 0 && (
          <div className="rounded-lg border border-border">
            <div className="border-b border-border bg-muted/30 px-4 py-2 text-sm font-medium">Recent Saved Simulations</div>
            <div className="divide-y divide-border">
              {saved.map((sim) => (
                <div key={sim.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{sim.referral_type}</Badge>
                    <span className="text-muted-foreground">{sim.reward_basis}</span>
                    <span>Reward {fmt(Number(sim.reward_amount))} · Keeps {fmt(Number(sim.doctors_onlining_keeps))} · {Number(sim.profit_margin_percentage).toFixed(1)}%</span>
                  </div>
                  <StatusBadge status={sim.risk_status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Apply dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Simulation to a Reward Rule</DialogTitle>
            <DialogDescription>The reward basis, percentage, fixed amount and caps will be copied to the selected rule. Activation toggle is preserved.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Target reward rule</Label>
            <Select value={applyTargetId} onValueChange={setApplyTargetId}>
              <SelectTrigger><SelectValue placeholder="Select rule" /></SelectTrigger>
              <SelectContent>
                {settings.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.referrer_type} → {row.referred_type} · {row.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={applyToRule} disabled={busy || !applyTargetId}>
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override dialog */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" /> Override required</DialogTitle>
            <DialogDescription>
              This configuration produces a negative margin or the reward exceeds net platform revenue. Provide a written justification to proceed.
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Reason for overriding the profitability guardrail (min 10 chars)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmOverride}>Acknowledge & Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const Stat = ({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: "success" | "warning" | "danger" }) => {
  const accentCls =
    accent === "success" ? "text-emerald-700" :
    accent === "warning" ? "text-amber-700" :
    accent === "danger" ? "text-red-700" : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold ${accentCls}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
};

export default ProfitabilitySimulator;
