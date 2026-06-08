import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldAlert, Gift, Users, TrendingUp, CreditCard, Settings as SettingsIcon, BarChart3, ListChecks } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Overview = {
  total_referrals: number;
  doctor_referrals: number;
  patient_referrals: number;
  conversion_pct: number;
  pending_rewards: number;
  paid_rewards: number;
  fraud_flags: number;
  eligible_pending_approval: number;
};

const fmt = (n: number, currency = "ZAR") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n || 0);

const AdminReferralsCenter = () => {
  const [tab, setTab] = useState("overview");
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
        <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-4 w-4" />Overview</TabsTrigger>
        <TabsTrigger value="top" className="gap-1.5"><TrendingUp className="h-4 w-4" />Top</TabsTrigger>
        <TabsTrigger value="approvals" className="gap-1.5"><Gift className="h-4 w-4" />Approvals</TabsTrigger>
        <TabsTrigger value="fraud" className="gap-1.5"><ShieldAlert className="h-4 w-4" />Fraud</TabsTrigger>
        <TabsTrigger value="settings" className="gap-1.5"><SettingsIcon className="h-4 w-4" />Rewards</TabsTrigger>
        <TabsTrigger value="payouts" className="gap-1.5"><CreditCard className="h-4 w-4" />Payouts</TabsTrigger>
        <TabsTrigger value="audit" className="gap-1.5"><ListChecks className="h-4 w-4" />Audit</TabsTrigger>
        <TabsTrigger value="program" className="gap-1.5"><Users className="h-4 w-4" />Program</TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><Overview /></TabsContent>
      <TabsContent value="top"><TopReferrers /></TabsContent>
      <TabsContent value="approvals"><PendingApprovals /></TabsContent>
      <TabsContent value="fraud"><FraudMonitoring /></TabsContent>
      <TabsContent value="settings"><RewardSettings /></TabsContent>
      <TabsContent value="payouts"><PayoutManagement /></TabsContent>
      <TabsContent value="audit"><CalculationsAudit /></TabsContent>
      <TabsContent value="program"><ProgramSettings /></TabsContent>
    </Tabs>
  );
};

const Overview = () => {
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    supabase.rpc("admin_referral_overview").then(({ data }) => setData(data as Overview));
  }, []);
  if (!data) return <Loader />;
  const tiles = [
    { label: "Total Referrals", value: data.total_referrals },
    { label: "Doctor Referrals", value: data.doctor_referrals },
    { label: "Patient Referrals", value: data.patient_referrals },
    { label: "Conversion %", value: `${data.conversion_pct}%` },
    { label: "Pending Approval", value: data.eligible_pending_approval },
    { label: "Pending Rewards", value: fmt(data.pending_rewards) },
    { label: "Paid Rewards", value: fmt(data.paid_rewards) },
    { label: "Open Fraud Flags", value: data.fraud_flags },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label}>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{t.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const TopReferrers = () => {
  const [role, setRole] = useState<"doctor" | "patient">("doctor");
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [ltv, setLtv] = useState<any | null>(null);

  useEffect(() => {
    supabase.rpc("admin_top_referrers_by_type", { _role: role, _limit: 50 }).then(({ data }) => setRows(data ?? []));
  }, [role]);

  const openLtv = async (row: any) => {
    setSelected(row); setLtv(null);
    const { data } = await supabase.rpc("admin_referrer_lifetime_value", { _referrer_id: row.user_id });
    setLtv(data);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Top Referrers</CardTitle>
          <Select value={role} onValueChange={(v) => setRole(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="doctor">Top Doctors</SelectItem>
              <SelectItem value="patient">Top Patients</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardDescription>Click a row to see lifetime value generated.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Approved</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Earned</TableHead>
              <TableHead className="text-right">Lifetime Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.user_id} className="cursor-pointer hover:bg-muted/40" onClick={() => openLtv(r)}>
                <TableCell>{r.full_name || r.email}</TableCell>
                <TableCell className="text-right">{r.total}</TableCell>
                <TableCell className="text-right">{r.approved}</TableCell>
                <TableCell className="text-right">{r.paid}</TableCell>
                <TableCell className="text-right">{fmt(Number(r.total_earned))}</TableCell>
                <TableCell className="text-right">{fmt(Number(r.lifetime_value))}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">No referrers yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selected?.full_name || selected?.email} — Lifetime Value</DialogTitle></DialogHeader>
          {!ltv ? <Loader /> : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Total referrals", ltv.total_referrals],
                ["Completed referrals", ltv.completed_referrals],
                ["Consultations generated", ltv.consultations_generated],
                ["Gross revenue generated", fmt(Number(ltv.gross_revenue_generated))],
                ["Platform fees generated", fmt(Number(ltv.platform_fees_generated))],
                ["Rewards pending", fmt(Number(ltv.rewards_pending))],
                ["Rewards approved", fmt(Number(ltv.rewards_approved))],
                ["Rewards paid", fmt(Number(ltv.rewards_paid))],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
                  <p className="mt-1 font-display text-lg font-semibold">{String(v)}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const PendingApprovals = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("referrals")
      .select("id,referrer_id,referred_email,referred_type,reward_amount,reward_currency,first_consultation_date,status")
      .eq("status", "eligible")
      .order("first_consultation_date", { ascending: true });
    setRows(data ?? []); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, approve: boolean) => {
    const fn = approve ? "admin_approve_referral_reward" : "admin_reject_referral_reward";
    const args: any = approve ? { _referral_id: id } : { _referral_id: id, _reason: "Rejected by admin" };
    const { error } = await supabase.rpc(fn, args);
    if (error) toast({ variant: "destructive", title: "Action failed", description: error.message });
    else { toast({ title: approve ? "Approved" : "Rejected" }); load(); }
  };

  if (loading) return <Loader />;
  return (
    <Card>
      <CardHeader><CardTitle>Pending Reward Approvals</CardTitle>
        <CardDescription>Referrals that became eligible after the invite's first completed consultation.</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing pending.</p> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invite</TableHead><TableHead>Type</TableHead><TableHead>First Consult</TableHead>
              <TableHead className="text-right">Reward</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-[200px] truncate">{r.referred_email || "—"}</TableCell>
                  <TableCell className="capitalize">{r.referred_type}</TableCell>
                  <TableCell>{r.first_consultation_date ? new Date(r.first_consultation_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-right">{r.reward_amount ? fmt(Number(r.reward_amount), r.reward_currency || "ZAR") : "—"}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" onClick={() => act(r.id, true)}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => act(r.id, false)}>Reject</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
      </CardContent>
    </Card>
  );
};

const FraudMonitoring = () => {
  const [rows, setRows] = useState<any[]>([]);
  const { toast } = useToast();
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("referral_fraud_flags")
      .select("id,referral_id,flag_type,severity,details,resolved,created_at")
      .eq("resolved", false)
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string) => {
    const { error } = await supabase
      .from("referral_fraud_flags")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast({ variant: "destructive", title: "Failed", description: error.message });
    else { toast({ title: "Flag resolved" }); load(); }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Open Fraud Flags</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No open flags.</p> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>Type</TableHead><TableHead>Severity</TableHead><TableHead>Details</TableHead>
              <TableHead>When</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="outline">{r.flag_type}</Badge></TableCell>
                  <TableCell><Badge variant={r.severity === "block" ? "destructive" : "secondary"}>{r.severity}</Badge></TableCell>
                  <TableCell className="max-w-[260px] truncate font-mono text-xs">{JSON.stringify(r.details)}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => resolve(r.id)}>Resolve</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
      </CardContent>
    </Card>
  );
};

const RewardSettings = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();
  const load = useCallback(async () => {
    const { data } = await supabase.from("referral_reward_settings").select("*").order("referrer_type").order("referred_type");
    setRows(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const update = async (id: string, patch: any) => {
    setSaving(id);
    const { error } = await supabase.from("referral_reward_settings").update(patch).eq("id", id);
    setSaving(null);
    if (error) toast({ variant: "destructive", title: "Save failed", description: error.message });
    else { toast({ title: "Saved" }); load(); }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Reward Settings</CardTitle>
        <CardDescription>
          Configure every reward rule per referrer → referred type and country. Admin can edit at any time; calculations run automatically after the trigger event.
        </CardDescription></CardHeader>
      <CardContent className="space-y-6">
        {rows.map((r) => (
          <RewardSettingCard key={r.id} row={r} onSave={update} saving={saving === r.id} />
        ))}
        {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No reward rows configured.</p>}
      </CardContent>
    </Card>
  );
};

const RewardSettingCard = ({ row, onSave, saving }: { row: any; onSave: (id: string, patch: any) => void; saving: boolean }) => {
  const [s, setS] = useState({
    reward_type: row.reward_type,
    reward_basis: row.reward_basis || "fixed_amount",
    amount: String(row.amount ?? 0),
    reward_percentage: String(row.reward_percentage ?? 0),
    currency: row.currency || "ZAR",
    reward_duration_months: row.reward_duration_months ?? "",
    monthly_reward_cap: row.monthly_reward_cap ?? "",
    lifetime_reward_cap: row.lifetime_reward_cap ?? "",
    trigger_event: row.trigger_event || "first_consultation_completed",
    is_enabled: !!row.is_enabled,
    requires_admin_approval: !!row.requires_admin_approval,
    req_email: row.verification_requirements?.email ?? true,
    req_phone: row.verification_requirements?.phone ?? true,
    req_id: row.verification_requirements?.id ?? true,
    req_hpcsa: row.verification_requirements?.hpcsa ?? true,
  });
  const set = (k: string, v: any) => setS((p) => ({ ...p, [k]: v }));
  const isPct = s.reward_basis !== "fixed_amount";

  const submit = () => onSave(row.id, {
    reward_type: s.reward_type,
    reward_basis: s.reward_basis,
    amount: Number(s.amount) || 0,
    reward_percentage: Number(s.reward_percentage) || 0,
    currency: s.currency,
    reward_duration_months: s.reward_duration_months === "" ? null : Number(s.reward_duration_months),
    monthly_reward_cap: s.monthly_reward_cap === "" ? null : Number(s.monthly_reward_cap),
    lifetime_reward_cap: s.lifetime_reward_cap === "" ? null : Number(s.lifetime_reward_cap),
    trigger_event: s.trigger_event,
    is_enabled: s.is_enabled,
    requires_admin_approval: s.requires_admin_approval,
    verification_requirements: { email: s.req_email, phone: s.req_phone, id: s.req_id, hpcsa: s.req_hpcsa },
  });

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">{row.referrer_type}</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant="secondary" className="capitalize">{row.referred_type}</Badge>
          <Badge variant="outline">{row.country}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-xs">Enabled</Label>
          <Switch checked={s.is_enabled} onCheckedChange={(v) => set("is_enabled", v)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label className="text-xs">Reward Type</Label>
          <Select value={s.reward_type} onValueChange={(v) => set("reward_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="wallet_credit">Wallet Credit</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="voucher">Voucher</SelectItem>
              <SelectItem value="promo_credit">Promo Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Reward Basis</Label>
          <Select value={s.reward_basis} onValueChange={(v) => set("reward_basis", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
              <SelectItem value="pct_platform_fee">% Platform Fee</SelectItem>
              <SelectItem value="pct_consultation_fee">% Consultation Fee</SelectItem>
              <SelectItem value="pct_net_revenue">% Net Revenue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Trigger Event</Label>
          <Select value={s.trigger_event} onValueChange={(v) => set("trigger_event", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="signup">Signup</SelectItem>
              <SelectItem value="email_verified">Email Verified</SelectItem>
              <SelectItem value="identity_verified">Identity Verified</SelectItem>
              <SelectItem value="first_consultation_completed">First Consultation</SelectItem>
              <SelectItem value="per_consultation">Per Consultation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Fixed Amount</Label>
          <Input type="number" value={s.amount} onChange={(e) => set("amount", e.target.value)} disabled={isPct && s.reward_basis !== "fixed_amount" && false} />
        </div>
        <div>
          <Label className="text-xs">Reward Percentage (%)</Label>
          <Input type="number" step="0.001" value={s.reward_percentage} onChange={(e) => set("reward_percentage", e.target.value)} disabled={!isPct} />
        </div>
        <div>
          <Label className="text-xs">Currency</Label>
          <Input value={s.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
        </div>
        <div>
          <Label className="text-xs">Reward Duration (months, blank = lifetime)</Label>
          <Input type="number" min={0} value={s.reward_duration_months} onChange={(e) => set("reward_duration_months", e.target.value)} placeholder="Lifetime" />
        </div>
        <div>
          <Label className="text-xs">Monthly Reward Cap (blank = none)</Label>
          <Input type="number" value={s.monthly_reward_cap} onChange={(e) => set("monthly_reward_cap", e.target.value)} placeholder="No cap" />
        </div>
        <div>
          <Label className="text-xs">Lifetime Reward Cap (blank = none)</Label>
          <Input type="number" value={s.lifetime_reward_cap} onChange={(e) => set("lifetime_reward_cap", e.target.value)} placeholder="No cap" />
        </div>
      </div>

      <div className="mt-4">
        <Label className="text-xs">Verification Requirements</Label>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          {[
            ["req_email", "Email verified"],
            ["req_phone", "Phone provided"],
            ["req_id", "ID uploaded"],
            ["req_hpcsa", "HPCSA verified (doctors)"],
          ].map(([k, l]) => (
            <label key={k} className="flex items-center gap-2">
              <Switch checked={(s as any)[k]} onCheckedChange={(v) => set(k, v)} />
              <span>{l}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={s.requires_admin_approval} onCheckedChange={(v) => set("requires_admin_approval", v)} />
          <span>Requires admin approval before payout</span>
        </label>
        <Button size="sm" disabled={saving} onClick={submit}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
};

const CalculationsAudit = () => {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("referral_reward_calculations")
      .select("id,created_at,referrer_id,referral_id,appointment_id,trigger_event,basis,percentage,fixed_amount,basis_value,computed_amount,applied_amount,currency,monthly_used,lifetime_used,monthly_cap,lifetime_cap,decision,reason")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <Card>
      <CardHeader><CardTitle>Reward Calculations Audit Trail</CardTitle>
        <CardDescription>Every automatic reward calculation, including capped, skipped and partial decisions.</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No calculations recorded yet.</p> :
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>When</TableHead><TableHead>Trigger</TableHead><TableHead>Basis</TableHead>
                <TableHead className="text-right">Basis Value</TableHead>
                <TableHead className="text-right">Computed</TableHead>
                <TableHead className="text-right">Applied</TableHead>
                <TableHead>Decision</TableHead><TableHead>Reason</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{r.trigger_event}</Badge></TableCell>
                    <TableCell className="text-xs">{r.basis}{r.basis !== "fixed_amount" ? ` (${r.percentage}%)` : ""}</TableCell>
                    <TableCell className="text-right">{fmt(Number(r.basis_value), r.currency)}</TableCell>
                    <TableCell className="text-right">{fmt(Number(r.computed_amount), r.currency)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(Number(r.applied_amount), r.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={r.decision === "credited" ? "default" : r.decision === "partial" ? "secondary" : "outline"}>{r.decision}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">{r.reason || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>}
      </CardContent>
    </Card>
  );
};

const PayoutManagement = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [ref, setRef] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("referral_rewards_ledger")
      .select("id,user_id,amount,currency,status,entry_type,created_at,notes,referral_id")
      .eq("status", "approved")
      .order("created_at", { ascending: true });
    setRows(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const pay = async (id: string) => {
    const reference = ref[id] || "";
    const { error } = await supabase.rpc("admin_mark_payout_paid", { _ledger_id: id, _reference: reference });
    if (error) toast({ variant: "destructive", title: "Failed", description: error.message });
    else { toast({ title: "Marked paid" }); load(); }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Cash Payouts Awaiting Settlement</CardTitle>
        <CardDescription>Wallet credits are paid automatically on approval. Cash payouts appear here.</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No payouts pending.</p> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>User</TableHead><TableHead>Amount</TableHead><TableHead>Approved</TableHead>
              <TableHead>Reference</TableHead><TableHead className="text-right">Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.user_id}</TableCell>
                  <TableCell>{fmt(Number(r.amount), r.currency)}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell><Input value={ref[r.id] || ""} onChange={(e) => setRef((p) => ({ ...p, [r.id]: e.target.value }))} placeholder="Bank ref / transaction id" /></TableCell>
                  <TableCell className="text-right"><Button size="sm" onClick={() => pay(r.id)}>Mark Paid</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
      </CardContent>
    </Card>
  );
};

const ProgramSettings = () => {
  const [row, setRow] = useState<any>(null);
  const { toast } = useToast();
  useEffect(() => {
    supabase.from("referral_program_settings").select("*").limit(1).maybeSingle().then(({ data }) => setRow(data));
  }, []);
  const toggle = async (field: string, value: boolean) => {
    if (!row) return;
    setRow({ ...row, [field]: value });
    const { error } = await supabase.from("referral_program_settings").update({ [field]: value }).eq("id", row.id);
    if (error) toast({ variant: "destructive", title: "Save failed", description: error.message });
    else toast({ title: "Updated" });
  };
  if (!row) return <Loader />;
  const switches: Array<{ key: string; label: string; help: string }> = [
    { key: "tracking_enabled", label: "Referral Tracking", help: "Master switch — turn the whole program on/off." },
    { key: "identity_verification_required", label: "Identity Verification Required", help: "Block payouts until ID is verified." },
    { key: "manual_reward_approval", label: "Manual Reward Approval", help: "Admin must approve each reward before it's credited." },
    { key: "wallet_credits_enabled", label: "Wallet Credits Enabled", help: "Allow wallet-credit rewards." },
    { key: "fraud_detection_enabled", label: "Fraud Detection", help: "Block self/duplicate referrals, flag suspicious patterns." },
    { key: "auto_cash_payouts", label: "Automatic Cash Payouts", help: "Disabled at launch — admin pays manually." },
    { key: "multi_level_enabled", label: "Multi-Level Commissions", help: "Disabled at launch — future feature." },
  ];
  return (
    <Card>
      <CardHeader><CardTitle>Program Settings</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {switches.map((s) => (
          <div key={s.key} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0">
            <div>
              <Label className="text-sm font-medium">{s.label}</Label>
              <p className="text-xs text-muted-foreground">{s.help}</p>
            </div>
            <Switch checked={!!row[s.key]} onCheckedChange={(v) => toggle(s.key, v)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const Loader = () => (
  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
);

export default AdminReferralsCenter;
