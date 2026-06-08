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
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.rpc("admin_top_referrers", { _limit: 50 }).then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <Card>
      <CardHeader><CardTitle>Top Referrers</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Type</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Approved</TableHead>
              <TableHead className="text-right">Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.user_id}>
                <TableCell>{r.full_name}</TableCell>
                <TableCell className="capitalize">{r.user_type}</TableCell>
                <TableCell className="text-right">{r.total}</TableCell>
                <TableCell className="text-right">{r.approved}</TableCell>
                <TableCell className="text-right">{fmt(Number(r.total_earned))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
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
        <CardDescription>Configure rewards per referrer→referred type and country. All amounts admin-controlled.</CardDescription></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Referrer</TableHead><TableHead>Referred</TableHead><TableHead>Country</TableHead>
            <TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Currency</TableHead>
            <TableHead>Enabled</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <RewardRow key={r.id} row={r} onSave={update} saving={saving === r.id} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const RewardRow = ({ row, onSave, saving }: { row: any; onSave: (id: string, patch: any) => void; saving: boolean }) => {
  const [amount, setAmount] = useState<string>(String(row.amount ?? 0));
  const [currency, setCurrency] = useState<string>(row.currency || "ZAR");
  const [type, setType] = useState<string>(row.reward_type);
  const [enabled, setEnabled] = useState<boolean>(!!row.is_enabled);
  return (
    <TableRow>
      <TableCell className="capitalize">{row.referrer_type}</TableCell>
      <TableCell className="capitalize">{row.referred_type}</TableCell>
      <TableCell>{row.country}</TableCell>
      <TableCell>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="wallet_credit">Wallet Credit</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="voucher">Voucher</SelectItem>
            <SelectItem value="promo_credit">Promo Credit</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell><Input className="w-[110px]" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></TableCell>
      <TableCell><Input className="w-[90px]" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} /></TableCell>
      <TableCell><Switch checked={enabled} onCheckedChange={setEnabled} /></TableCell>
      <TableCell className="text-right">
        <Button size="sm" disabled={saving} onClick={() => onSave(row.id, {
          amount: Number(amount) || 0, currency, reward_type: type, is_enabled: enabled,
        })}>{saving ? "..." : "Save"}</Button>
      </TableCell>
    </TableRow>
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
