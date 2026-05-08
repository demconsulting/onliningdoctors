import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Wallet, TrendingUp, ArrowUpRight, Clock, ShieldCheck, Loader2, Send,
  CreditCard, Percent, Receipt, Landmark, Info,
} from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval, isSameDay } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { User } from "@supabase/supabase-js";
import { getCurrencySymbol, COUNTRY_CURRENCY } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

interface Props {
  user: User;
  doctorCountry?: string | null;
}

const PLATFORM_FEE_PCT = 10; // 10% platform commission for wallet display
const PROCESSING_FEE_FLAT = 5.5; // flat processing fee approximation

type TxStatus = "pending" | "processing" | "paid" | "failed" | "refunded";

const STATUS_BADGE: Record<TxStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  processing: { label: "Processing", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  paid: { label: "Paid", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  failed: { label: "Failed", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  refunded: { label: "Refunded", cls: "bg-muted text-muted-foreground border-border" },
};

const TYPE_LABEL: Record<string, string> = {
  card_consultation: "Card Consultation",
  medical_aid_consultation: "Medical Aid",
  co_payment: "Co-payment",
  refund: "Refund",
  adjustment: "Adjustment",
};

function mapStatus(p: any): TxStatus {
  const s = (p.status || "").toLowerCase();
  if (s === "success" || s === "successful" || s === "paid") return "paid";
  if (s === "failed" || s === "expired") return "failed";
  if (s === "refunded") return "refunded";
  if (s === "processing") return "processing";
  return "pending";
}

function inferType(p: any): string {
  if (p.transaction_type) return p.transaction_type;
  const m = p.appointments?.payment_method_type;
  if (m === "medical_aid") return "medical_aid_consultation";
  return "card_consultation";
}

const DoctorWallet = ({ user, doctorCountry }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [autoWeekly, setAutoWeekly] = useState(false);
  const [hasBilling, setHasBilling] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const code = doctorCountry?.length === 2 ? doctorCountry.toUpperCase() : undefined;
  const currency = (code && COUNTRY_CURRENCY[code]?.currency) || payments[0]?.currency || "ZAR";
  const symbol = getCurrencySymbol(doctorCountry);

  const fmt = (n: number) => `${symbol}${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    (async () => {
      const [payRes, doctorRes, billRes, payoutRes] = await Promise.all([
        supabase.from("payments")
          .select("*, appointments(scheduled_at, reason, payment_method_type, pricing_tier_type, patient_id), patient:patient_id(full_name)" as any)
          .eq("doctor_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("doctors").select("auto_weekly_payout").eq("profile_id", user.id).maybeSingle(),
        supabase.from("doctor_billing").select("id").eq("doctor_id", user.id).maybeSingle(),
        supabase.from("payout_requests").select("*").eq("doctor_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      setPayments((payRes.data as any[]) || []);
      setAutoWeekly(!!(doctorRes.data as any)?.auto_weekly_payout);
      setHasBilling(!!billRes.data);
      setPayouts(payoutRes.data || []);
      setLoading(false);
    })();
  }, [user.id]);

  // Build transaction rows w/ fee breakdown
  const transactions = useMemo(() => {
    return payments.map(p => {
      const status = mapStatus(p);
      const gross = Number(p.amount) || 0;
      const platformFee = +(gross * (PLATFORM_FEE_PCT / 100)).toFixed(2);
      const processingFee = status === "paid" ? (Number(p.fee_amount) || PROCESSING_FEE_FLAT) : 0;
      const net = +(gross - platformFee - processingFee).toFixed(2);
      return {
        id: p.id,
        date: p.paid_at || p.created_at,
        patient: p.patient?.full_name || "Patient",
        type: inferType(p),
        gross, platformFee, processingFee, net,
        status,
        paid_at: p.paid_at,
        appointment_id: p.appointment_id,
      };
    });
  }, [payments]);

  const filtered = transactions.filter(t =>
    (filterStatus === "all" || t.status === filterStatus) &&
    (filterType === "all" || t.type === filterType),
  );

  const paidPaymentIds = useMemo(() => transactions.filter(t => t.status === "paid").map(t => t.id), [transactions]);
  const totalPayoutsAmount = useMemo(() =>
    payouts.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0)
  , [payouts]);
  const lockedInPayoutIds = useMemo(() => {
    const ids = new Set<string>();
    payouts.forEach(p => (p.payment_ids || []).forEach((id: string) => ids.add(id)));
    return ids;
  }, [payouts]);

  const summary = useMemo(() => {
    const paid = transactions.filter(t => t.status === "paid");
    const pending = transactions.filter(t => t.status === "pending" || t.status === "processing");
    const totalEarnings = paid.reduce((s, t) => s + t.net, 0);
    const totalPlatform = paid.reduce((s, t) => s + t.platformFee, 0);
    const pendingNet = pending.reduce((s, t) => s + t.net, 0);
    const availableNet = paid
      .filter(t => !lockedInPayoutIds.has(t.id))
      .reduce((s, t) => s + t.net, 0);
    return {
      available: Math.max(0, availableNet),
      pending: pendingNet,
      total: totalEarnings,
      platform: totalPlatform,
      withdrawn: totalPayoutsAmount,
    };
  }, [transactions, lockedInPayoutIds, totalPayoutsAmount]);

  // 30-day chart
  const chartData = useMemo(() => {
    const start = startOfDay(subDays(new Date(), 29));
    const days = eachDayOfInterval({ start, end: new Date() });
    return days.map(day => {
      const dayPaid = transactions.filter(t => t.status === "paid" && t.paid_at && isSameDay(new Date(t.paid_at), day));
      return {
        label: format(day, "MMM d"),
        net: dayPaid.reduce((s, t) => s + t.net, 0),
      };
    });
  }, [transactions]);

  const toggleAuto = async (val: boolean) => {
    setAutoWeekly(val);
    const { error } = await supabase.from("doctors").update({ auto_weekly_payout: val } as any).eq("profile_id", user.id);
    if (error) {
      setAutoWeekly(!val);
      toast({ variant: "destructive", title: "Could not update", description: error.message });
    } else {
      toast({ title: val ? "Weekly auto-payout enabled" : "Auto-payout disabled" });
    }
  };

  const requestWithdrawal = async () => {
    if (summary.available < 200) {
      toast({ variant: "destructive", title: "Minimum payout is R200" });
      return;
    }
    if (!hasBilling) {
      toast({ variant: "destructive", title: "Add bank details first", description: "Go to Payments → Payout Settings to add your bank account." });
      return;
    }
    const availableIds = paidPaymentIds.filter(id => !lockedInPayoutIds.has(id));
    setRequesting(true);
    const { error } = await supabase.from("payout_requests").insert({
      doctor_id: user.id,
      amount: summary.available,
      currency,
      payment_ids: availableIds,
      status: "pending",
    } as any);
    setRequesting(false);
    if (error) {
      toast({ variant: "destructive", title: "Request failed", description: error.message });
    } else {
      toast({ title: "Withdrawal requested", description: "Our team will process it shortly." });
      setWithdrawOpen(false);
      const { data: po } = await supabase.from("payout_requests").select("*").eq("doctor_id", user.id).order("created_at", { ascending: false }).limit(50);
      setPayouts(po || []);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Hero summary */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Wallet className="h-6 w-6" /></div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Available Balance</p>
              <p className="font-display text-3xl font-bold">{fmt(summary.available)}</p>
              <p className="text-xs text-muted-foreground mt-1">Ready to withdraw to your bank ({currency})</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Auto weekly payout</p>
              <Switch checked={autoWeekly} onCheckedChange={toggleAuto} />
            </div>
            <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 gradient-primary border-0 text-primary-foreground" disabled={summary.available <= 0}>
                  <Send className="h-4 w-4" /> Request Withdrawal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Withdrawal</DialogTitle>
                  <DialogDescription>
                    Funds will be paid to the bank account on file in Payments → Payout Settings.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="flex justify-between rounded-md border p-3">
                    <span className="text-sm text-muted-foreground">Available</span>
                    <span className="font-semibold">{fmt(summary.available)}</span>
                  </div>
                  <div className="flex justify-between rounded-md border p-3">
                    <span className="text-sm text-muted-foreground">Currency</span>
                    <span className="font-semibold">{currency}</span>
                  </div>
                  {!hasBilling && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                      No bank details on file — add them in Payments first.
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Minimum payout {symbol}200.00. Processed within 1–3 business days.</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
                  <Button onClick={requestWithdrawal} disabled={requesting || !hasBilling}>
                    {requesting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Confirm Withdrawal
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<Clock className="h-5 w-5" />} label="Pending Balance" value={fmt(summary.pending)} hint="Awaiting completion" />
        <SummaryCard icon={<TrendingUp className="h-5 w-5" />} label="Total Earnings" value={fmt(summary.total)} hint="Lifetime net" />
        <SummaryCard icon={<Percent className="h-5 w-5" />} label="Total Platform Fees" value={fmt(summary.platform)} hint={`${PLATFORM_FEE_PCT}% per consultation`} />
        <SummaryCard icon={<Landmark className="h-5 w-5" />} label="Total Withdrawn" value={fmt(summary.withdrawn)} hint={`${payouts.filter(p => p.status === "paid").length} payouts`} />
      </div>

      {/* Fee transparency */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> How your earnings are calculated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4 text-sm">
            <FeeRow label="Consultation Fee" value="100%" tone="default" />
            <FeeRow label="Platform Fee" value={`− ${PLATFORM_FEE_PCT}%`} tone="warn" />
            <FeeRow label="Processing Fee" value={`− ~${symbol}${PROCESSING_FEE_FLAT.toFixed(2)}`} tone="warn" />
            <FeeRow label="You Receive" value={`= ~${(100 - PLATFORM_FEE_PCT)}%`} tone="good" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3 w-3 mt-0.5 shrink-0" /> Example: a {symbol}297 consultation → platform {fmt(29.70)}, processing {fmt(5.50)}, you receive {fmt(297 - 29.70 - 5.50)}.
          </p>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Net Earnings — Last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="walletGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={60} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(v: number) => fmt(v)}
              />
              <Area type="monotone" dataKey="net" stroke="hsl(var(--primary))" fill="url(#walletGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabs: transactions / payouts */}
      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <CardTitle className="text-base">Transaction history</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <select className="h-9 rounded-md border bg-background px-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="all">All statuses</option>
                    {Object.keys(STATUS_BADGE).map(s => <option key={s} value={s}>{STATUS_BADGE[s as TxStatus].label}</option>)}
                  </select>
                  <select className="h-9 rounded-md border bg-background px-2 text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="all">All types</option>
                    {Object.keys(TYPE_LABEL).map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No transactions match your filters.</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Gross</TableHead>
                          <TableHead className="text-right">Platform</TableHead>
                          <TableHead className="text-right">Processing</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(t => (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs">{format(new Date(t.date), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-sm">{t.patient}</TableCell>
                            <TableCell className="text-xs">{TYPE_LABEL[t.type] || t.type}</TableCell>
                            <TableCell className="text-right text-sm">{fmt(t.gross)}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">−{fmt(t.platformFee)}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">−{fmt(t.processingFee)}</TableCell>
                            <TableCell className="text-right font-semibold text-sm">{fmt(t.net)}</TableCell>
                            <TableCell><Badge variant="outline" className={STATUS_BADGE[t.status].cls}>{STATUS_BADGE[t.status].label}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {filtered.map(t => (
                      <div key={t.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{t.patient}</span>
                          <Badge variant="outline" className={STATUS_BADGE[t.status].cls}>{STATUS_BADGE[t.status].label}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{format(new Date(t.date), "MMM d, yyyy")}</span>
                          <span>{TYPE_LABEL[t.type] || t.type}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Net earnings</span>
                          <span className="font-semibold">{fmt(t.net)}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Gross {fmt(t.gross)} · Platform −{fmt(t.platformFee)} · Processing −{fmt(t.processingFee)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payout requests</CardTitle>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No payout requests yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map(p => {
                      const status = (p.status || "pending") as TxStatus;
                      const meta = STATUS_BADGE[status] || STATUS_BADGE.pending;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs">{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(Number(p.amount))}</TableCell>
                          <TableCell><Badge variant="outline" className={meta.cls}>{meta.label}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.admin_notes || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const SummaryCard = ({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

const FeeRow = ({ label, value, tone }: { label: string; value: string; tone: "default" | "warn" | "good" }) => {
  const cls = tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-foreground";
  return (
    <div className="rounded-md border p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold ${cls}`}>{value}</p>
    </div>
  );
};

export default DoctorWallet;
