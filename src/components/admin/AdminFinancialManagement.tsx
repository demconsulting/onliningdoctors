import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, startOfDay, subMonths, addMonths, addYears, addWeeks } from "date-fns";
import { Loader2, Plus, Pencil, Trash2, Download, Upload, FileText, Repeat, Receipt, TrendingUp, TrendingDown, Wallet, AlertTriangle, RefreshCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from "recharts";
import RecalcProcessingFees from "./RecalcProcessingFees";

type Category = { id: string; name: string; slug: string; parent_group: string; sort_order: number; is_active: boolean };
type Expense = {
  id: string; expense_date: string; category_id: string | null; supplier: string | null;
  description: string; amount: number; vat_amount: number; currency: string;
  payment_method: string | null; status: string; receipt_path: string | null;
  notes: string | null; tax_deductible: boolean; recurring_expense_id: string | null; created_at: string;
};
type Recurring = {
  id: string; category_id: string | null; supplier: string | null; description: string;
  amount: number; currency: string; frequency: string; next_due_date: string;
  reminder_days: number; is_active: boolean; notes: string | null;
};
export type CurrencyConversion = {
  id: string; payment_id: string; original_currency: string; original_amount: number;
  exchange_rate: number; converted_currency: string; converted_amount: number;
  conversion_method: "fixed_rate" | "manual" | "excluded" | "test_payment";
  converted_by: string | null; conversion_note: string | null;
  include_in_totals: boolean; created_at: string;
};

// Platform operates from South Africa — ZAR is the canonical currency for all
// aggregated revenue, fee, and earnings totals. Payments in other currencies are
// excluded from revenue totals unless an admin has recorded a conversion.
const PLATFORM_CURRENCY = "ZAR";

// Statuses considered "successful / completed" for revenue accounting.
const REVENUE_STATUSES = new Set(["success", "completed", "paid"]);
const PENDING_STATUSES = new Set(["pending", "processing", "awaiting_payment"]);

const fmt = (n: number, cur: string = PLATFORM_CURRENCY) =>
  `${cur} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DEFAULT_PROCESSING_FEE_PCT = 3.5;

// Derive granular processing/platform fees for a payment in its native currency.
const deriveGranularFees = (p: any, amount: number, totalFee: number) => {
  const hasProc = p.processing_fee_amount !== null && p.processing_fee_amount !== undefined;
  const hasPlat = p.platform_fee_amount !== null && p.platform_fee_amount !== undefined;
  let processing = hasProc ? Number(p.processing_fee_amount) : 0;
  let platform = hasPlat ? Number(p.platform_fee_amount) : 0;
  if (!hasProc && !hasPlat) {
    // Legacy estimate: assume default processing %; remainder is platform fee.
    const pct = p.processing_fee_percentage !== null && p.processing_fee_percentage !== undefined
      ? Number(p.processing_fee_percentage) : DEFAULT_PROCESSING_FEE_PCT;
    processing = +(amount * pct / 100).toFixed(2);
    platform = Math.max(0, +(totalFee - processing).toFixed(2));
  } else if (!hasProc) {
    processing = Math.max(0, +(totalFee - platform).toFixed(2));
  } else if (!hasPlat) {
    platform = Math.max(0, +(totalFee - processing).toFixed(2));
  }
  return { processing, platform };
};

// Classifies a payment row against revenue inclusion rules, factoring in any
// admin-recorded currency conversion. Returns the effective ZAR amount/fee used
// in totals.
const classifyPayment = (p: any, conv?: CurrencyConversion | null) => {
  const rawCur = p.currency || PLATFORM_CURRENCY;
  const rawAmt = Number(p.amount || 0);
  const rawFee = Number(p.fee_amount || 0);
  const granular = deriveGranularFees(p, rawAmt, rawFee);

  const base = (incl: boolean, reason: string, amt: number, fee: number, proc: number, plat: number, cur: string, converted: boolean, conversion: CurrencyConversion | null) =>
    ({ included: incl, reason, amount: amt, fee_amount: fee, processing_fee: proc, platform_fee: plat, currency: cur, converted, conversion });

  if (!REVENUE_STATUSES.has(p.status)) {
    return base(false, `Excluded: status=${p.status}`, rawAmt, rawFee, granular.processing, granular.platform, rawCur, false, null);
  }

  if (rawCur === PLATFORM_CURRENCY) {
    return base(true, "", rawAmt, rawFee, granular.processing, granular.platform, PLATFORM_CURRENCY, false, null);
  }

  // Non-ZAR — check if an admin conversion exists
  if (conv) {
    if (conv.conversion_method === "excluded" || conv.conversion_method === "test_payment" || !conv.include_in_totals) {
      return base(false, `Admin excluded (${conv.conversion_method})`, 0, 0, 0, 0, PLATFORM_CURRENCY, true, conv);
    }
    const rate = Number(conv.exchange_rate || 0);
    const convAmt = Number(conv.converted_amount || 0);
    const convFee = rate > 0 ? +(rawFee * rate).toFixed(2) : 0;
    const convProc = rate > 0 ? +(granular.processing * rate).toFixed(2) : 0;
    const convPlat = rate > 0 ? +(granular.platform * rate).toFixed(2) : 0;
    return base(true, "Converted to ZAR by admin", convAmt, convFee, convProc, convPlat, PLATFORM_CURRENCY, true, conv);
  }

  return base(false, `Currency mismatch: ${rawCur} ≠ ${PLATFORM_CURRENCY} (no conversion)`, rawAmt, rawFee, granular.processing, granular.platform, rawCur, false, null);
};

const StatCard = ({ label, value, icon: Icon, tone = "default" }: any) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground mt-1">{value}</p>
        </div>
        {Icon && (
          <div className={`p-2 rounded-md ${tone === "good" ? "bg-emerald-500/10 text-emerald-600" : tone === "bad" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const downloadCSV = (filename: string, rows: any[]) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const AdminFinancialManagement = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  const [payments, setPayments] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [doctorNames, setDoctorNames] = useState<Record<string, string>>({});
  const [conversions, setConversions] = useState<CurrencyConversion[]>([]);
  const [referralByAppt, setReferralByAppt] = useState<Record<string, number>>({});
  const [appointments, setAppointments] = useState<Record<string, any>>({});
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});

  const loadAll = async () => {
    setLoading(true);
    const [p, po, ex, rc, ct, cv, rr] = await Promise.all([
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("payout_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("recurring_expenses").select("*").order("next_due_date"),
      supabase.from("expense_categories").select("*").order("sort_order"),
      (supabase as any).from("financial_currency_conversions").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("referral_reward_calculations").select("appointment_id, applied_amount, decision"),
    ]);
    setPayments(p.data || []);
    setPayouts(po.data || []);
    setExpenses((ex.data as any) || []);
    setRecurring((rc.data as any) || []);
    setCategories((ct.data as any) || []);
    setConversions((cv?.data as any) || []);

    // Aggregate referral commissions per appointment
    const refMap: Record<string, number> = {};
    ((rr?.data as any) || []).forEach((r: any) => {
      if (!r.appointment_id) return;
      if (r.decision === 'credited' || r.decision === 'partial') {
        refMap[r.appointment_id] = (refMap[r.appointment_id] || 0) + Number(r.applied_amount || 0);
      }
    });
    setReferralByAppt(refMap);

    const apptIds = [...new Set((p.data || []).map((x: any) => x.appointment_id).filter(Boolean))];
    if (apptIds.length) {
      const { data: appts } = await supabase.from("appointments").select("id, scheduled_at, reason, patient_id").in("id", apptIds);
      const aMap: Record<string, any> = {};
      (appts || []).forEach((a: any) => (aMap[a.id] = a));
      setAppointments(aMap);
    }

    const ids = [...new Set([
      ...(p.data || []).map((x: any) => x.doctor_id),
      ...(p.data || []).map((x: any) => x.patient_id),
      ...(po.data || []).map((x: any) => x.doctor_id),
    ].filter(Boolean))];
    if (ids.length) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      const pmap: Record<string, string> = {};
      (profiles || []).forEach((pr: any) => { map[pr.id] = pr.full_name || "Unknown"; pmap[pr.id] = pr.full_name || "Unknown"; });
      setDoctorNames(map);
      setPatientNames(pmap);
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const convMap = useMemo(() => {
    const m: Record<string, CurrencyConversion> = {};
    conversions.forEach((c) => { m[c.payment_id] = c; });
    return m;
  }, [conversions]);

  // Derived stats — strictly ZAR, includes admin-converted legacy payments
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());
    const classified = payments.map((p) => ({ p, c: classifyPayment(p, convMap[p.id]) }));
    const successful = classified.filter((x) => x.c.included);
    const pending = payments.filter((p) =>
      PENDING_STATUSES.has(p.status) && (p.currency || PLATFORM_CURRENCY) === PLATFORM_CURRENCY
    );
    const sumAmt = (arr: typeof successful) => arr.reduce((s, x) => s + x.c.amount, 0);
    const todayRev = sumAmt(successful.filter((x) => new Date(x.p.paid_at || x.p.created_at) >= today));
    const monthRev = sumAmt(successful.filter((x) => new Date(x.p.paid_at || x.p.created_at) >= monthStart));
    const totalRev = sumAmt(successful);
    const platformFees = successful.reduce((s, x) => s + x.c.fee_amount, 0);
    const medicalAidRev = sumAmt(successful.filter((x) => x.p.payment_method === "medical_aid" || x.p.transaction_type === "medical_aid"));
    const cardRev = sumAmt(successful.filter((x) => x.p.payment_method !== "medical_aid" && x.p.transaction_type !== "medical_aid"));
    const pendingRev = pending.reduce((s, p) => s + Number(p.amount), 0);
    const avgRev = successful.length ? totalRev / successful.length : 0;
    const consultations = successful.length;
    const doctorEarnings = totalRev - platformFees;
    const mismatched = payments.filter((p) =>
      REVENUE_STATUSES.has(p.status)
      && (p.currency || PLATFORM_CURRENCY) !== PLATFORM_CURRENCY
      && !convMap[p.id]
    ).length;

    const monthExp = expenses.filter((e) => new Date(e.expense_date) >= monthStart).reduce((s, e) => s + Number(e.amount), 0);
    const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0);

    const pendingPayouts = payouts.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
    const completedPayouts = payouts.filter((p) => p.status === "approved").reduce((s, p) => s + Number(p.amount), 0);

    return {
      todayRev, monthRev, totalRev, platformFees, doctorEarnings, medicalAidRev, cardRev, pendingRev, avgRev, consultations, mismatched,
      monthExp, totalExp, netProfit: totalRev - totalExp,
      pendingPayouts, completedPayouts,
    };
  }, [payments, expenses, payouts, convMap]);

  // Monthly trend (last 12 months) — includes converted ZAR
  const trend = useMemo(() => {
    const buckets: Record<string, { month: string; revenue: number; expenses: number; profit: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, "yyyy-MM");
      buckets[key] = { month: format(d, "MMM yy"), revenue: 0, expenses: 0, profit: 0 };
    }
    payments.forEach((p) => {
      const c = classifyPayment(p, convMap[p.id]);
      if (!c.included) return;
      const key = format(new Date(p.paid_at || p.created_at), "yyyy-MM");
      if (buckets[key]) buckets[key].revenue += c.amount;
    });
    expenses.forEach((e) => {
      const key = format(new Date(e.expense_date), "yyyy-MM");
      if (buckets[key]) buckets[key].expenses += Number(e.amount);
    });
    Object.values(buckets).forEach((b) => (b.profit = b.revenue - b.expenses));
    return Object.values(buckets);
  }, [payments, expenses, convMap]);

  // Doctor payout summary
  const doctorSummary = useMemo(() => {
    const rows: Record<string, any> = {};
    payments.forEach((p) => {
      const c = classifyPayment(p, convMap[p.id]);
      if (!c.included) return;
      const id = p.doctor_id;
      if (!rows[id]) rows[id] = { doctor_id: id, name: doctorNames[id] || "—", consultations: 0, revenue: 0, fees: 0 };
      rows[id].consultations += 1;
      rows[id].revenue += c.amount;
      rows[id].fees += c.fee_amount;
    });
    Object.values(rows).forEach((r: any) => (r.net = r.revenue - r.fees));
    payouts.forEach((po) => {
      const r = rows[po.doctor_id];
      if (!r) return;
      if (po.status === "pending") r.pending = (r.pending || 0) + Number(po.amount);
      if (po.status === "approved") r.completed = (r.completed || 0) + Number(po.amount);
    });
    return Object.values(rows);
  }, [payments, payouts, doctorNames, convMap]);


  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-display">Financial Management</h2>
          <p className="text-sm text-muted-foreground">
            All totals are reported in <strong>{PLATFORM_CURRENCY}</strong>. Only successful / completed payments
            in {PLATFORM_CURRENCY} are included in revenue.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadAll} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Repeat className="h-4 w-4 mr-1" />}
          Recalculate Financial Totals
        </Button>
      </div>

      {stats.mismatched > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-sm px-3 py-2">
          ⚠ {stats.mismatched} successful payment(s) found in a non-{PLATFORM_CURRENCY} currency. These are excluded
          from revenue totals — see the Revenue tab → Diagnostic panel for details.
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="payouts">Doctor Payouts</TabsTrigger>
          <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4 mt-6">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard label="Today's Revenue" value={fmt(stats.todayRev)} icon={TrendingUp} tone="good" />
            <StatCard label="This Month Revenue" value={fmt(stats.monthRev)} icon={TrendingUp} tone="good" />
            <StatCard label="Total Revenue" value={fmt(stats.totalRev)} icon={Receipt} />
            <StatCard label="This Month Expenses" value={fmt(stats.monthExp)} icon={TrendingDown} tone="bad" />
            <StatCard label="Total Expenses" value={fmt(stats.totalExp)} icon={TrendingDown} tone="bad" />
            <StatCard label="Net Profit" value={fmt(stats.netProfit)} icon={Wallet} tone={stats.netProfit >= 0 ? "good" : "bad"} />
            <StatCard label="Pending Payouts" value={fmt(stats.pendingPayouts)} icon={Wallet} />
            <StatCard label="Completed Payouts" value={fmt(stats.completedPayouts)} icon={Wallet} tone="good" />
            <StatCard label="Platform Fees" value={fmt(stats.platformFees)} icon={Receipt} tone="good" />
            <StatCard label="Medical Aid Revenue" value={fmt(stats.medicalAidRev)} icon={Receipt} />
            <StatCard label="Card Payment Revenue" value={fmt(stats.cardRev)} icon={Receipt} />
            <StatCard label="Avg / Consultation" value={fmt(stats.avgRev)} icon={Receipt} />
          </div>

          <Card>
            <CardHeader><CardTitle>Revenue vs Expenses (last 12 months)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} /><stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#g1)" />
                    <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" fill="url(#g2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Profit Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="profit" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REVENUE */}
        <TabsContent value="revenue" className="mt-6">
          <RevenueTab payments={payments} doctorNames={doctorNames} conversions={conversions} convMap={convMap} onChange={loadAll} />
        </TabsContent>

        {/* EXPENSES */}
        <TabsContent value="expenses" className="mt-6">
          <ExpensesTab expenses={expenses} categories={categories} onChange={loadAll} />
        </TabsContent>

        {/* PAYOUTS */}
        <TabsContent value="payouts" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Doctor Payouts Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Consultations</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Platform Fees</TableHead>
                      <TableHead>Net Earnings</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctorSummary.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
                    ) : doctorSummary.map((r: any) => (
                      <TableRow key={r.doctor_id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.consultations}</TableCell>
                        <TableCell>{fmt(r.revenue)}</TableCell>
                        <TableCell>{fmt(r.fees)}</TableCell>
                        <TableCell>{fmt(r.net)}</TableCell>
                        <TableCell>{fmt(r.pending || 0)}</TableCell>
                        <TableCell>{fmt(r.completed || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* P&L */}
        <TabsContent value="pl" className="mt-6 space-y-4">
          <PLTab trend={trend} />
        </TabsContent>

        {/* RECURRING */}
        <TabsContent value="recurring" className="mt-6">
          <RecurringTab recurring={recurring} categories={categories} onChange={loadAll} />
        </TabsContent>

        {/* REPORTS */}
        <TabsContent value="reports" className="mt-6 space-y-4">
          <Card>
            <CardHeader><CardTitle>Export Reports</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Button variant="outline" onClick={() => downloadCSV("revenue-report.csv", payments.filter(p => p.status === "success").map(p => ({
                date: p.paid_at || p.created_at, doctor: doctorNames[p.doctor_id] || "", amount: p.amount, currency: p.currency, method: p.payment_method, fee: p.fee_amount, reference: p.paystack_reference,
              })))}><Download className="h-4 w-4 mr-2" />Revenue Report (CSV)</Button>
              <Button variant="outline" onClick={() => downloadCSV("expense-report.csv", expenses.map(e => ({
                date: e.expense_date, supplier: e.supplier, description: e.description, amount: e.amount, vat: e.vat_amount, status: e.status, tax_deductible: e.tax_deductible,
              })))}><Download className="h-4 w-4 mr-2" />Expense Report (CSV)</Button>
              <Button variant="outline" onClick={() => downloadCSV("profit-report.csv", trend)}><Download className="h-4 w-4 mr-2" />Profit Report (CSV)</Button>
              <Button variant="outline" onClick={() => downloadCSV("doctor-payouts.csv", doctorSummary as any)}><Download className="h-4 w-4 mr-2" />Doctor Payout Report (CSV)</Button>
              <Button variant="outline" onClick={() => {
                const vatCollected = payments.filter(p => p.status === "success").reduce((s, p) => s + (Number(p.amount) * 0.15 / 1.15), 0);
                const vatPaid = expenses.reduce((s, e) => s + Number(e.vat_amount || 0), 0);
                const deductible = expenses.filter(e => e.tax_deductible).reduce((s, e) => s + Number(e.amount), 0);
                downloadCSV("tax-report.csv", [{ vat_collected_est: vatCollected.toFixed(2), vat_paid: vatPaid.toFixed(2), vat_net: (vatCollected - vatPaid).toFixed(2), deductible_expenses: deductible.toFixed(2) }]);
              }}><Download className="h-4 w-4 mr-2" />Tax Report (CSV)</Button>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">PDF and Excel exports use the same CSV data — open in Excel or use a CSV-to-PDF tool. Native PDF/XLSX support can be added on request.</p>
        </TabsContent>

        {/* CATEGORIES */}
        <TabsContent value="categories" className="mt-6">
          <CategoriesTab categories={categories} onChange={loadAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ===================== REVENUE TAB ===================== */
const RevenueTab = ({ payments, doctorNames, conversions, convMap, onChange }: any) => {
  const classified = useMemo(
    () => payments.map((p: any) => ({ ...p, _class: classifyPayment(p, convMap[p.id]) })),
    [payments, convMap]
  );
  const successful = classified.filter((p: any) => p._class.included);

  const totals = useMemo(() => {
    const total = successful.reduce((s: number, p: any) => s + p._class.amount, 0);
    const platform = successful.reduce((s: number, p: any) => s + p._class.fee_amount, 0);
    return {
      total,
      platform,
      doctorEarnings: total - platform,
      consultations: successful.length,
      medicalAid: successful
        .filter((p: any) => p.payment_method === "medical_aid" || p.transaction_type === "medical_aid")
        .reduce((s: number, p: any) => s + p._class.amount, 0),
      card: successful
        .filter((p: any) => p.payment_method !== "medical_aid" && p.transaction_type !== "medical_aid")
        .reduce((s: number, p: any) => s + p._class.amount, 0),
      pending: classified
        .filter((p: any) => PENDING_STATUSES.has(p.status) && (p.currency || PLATFORM_CURRENCY) === PLATFORM_CURRENCY)
        .reduce((s: number, p: any) => s + Number(p.amount), 0),
      convertedCount: successful.filter((p: any) => p._class.converted).length,
      convertedTotal: successful.filter((p: any) => p._class.converted).reduce((s: number, p: any) => s + p._class.amount, 0),
    };
  }, [classified, successful]);

  const [showDiag, setShowDiag] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={fmt(totals.total)} icon={Receipt} />
        <StatCard label="Platform Fees" value={fmt(totals.platform)} icon={Receipt} tone="good" />
        <StatCard label="Doctor Earnings" value={fmt(totals.doctorEarnings)} icon={Wallet} />
        <StatCard label="Consultations" value={totals.consultations} icon={Receipt} />
        <StatCard label="Medical Aid Revenue" value={fmt(totals.medicalAid)} icon={Receipt} />
        <StatCard label="Card Revenue" value={fmt(totals.card)} icon={Receipt} />
        <StatCard label="Pending Revenue" value={fmt(totals.pending)} icon={Receipt} tone="bad" />
        <StatCard label="Completed Revenue" value={fmt(totals.total)} icon={Receipt} tone="good" />
      </div>

      {totals.convertedCount > 0 && (
        <div className="rounded-md border border-primary/30 bg-primary/5 text-sm px-3 py-2 text-foreground">
          ℹ {totals.convertedCount} legacy non-{PLATFORM_CURRENCY} payment(s) — totalling {fmt(totals.convertedTotal)} — were converted by admin and are included in the totals above.
        </div>
      )}

      <CurrencyConversionPanel payments={payments} doctorNames={doctorNames} conversions={conversions} convMap={convMap} onChange={onChange} />

      <RecalcProcessingFees onComplete={onChange} />

      <Card>
        <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Doctor</TableHead><TableHead>Amount</TableHead><TableHead>Fee</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead>Flag</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {classified.slice(0, 50).map((p: any) => {
                  const cur = p.currency || PLATFORM_CURRENCY;
                  const mismatch = cur !== PLATFORM_CURRENCY;
                  const cls = p._class;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(p.paid_at || p.created_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="text-sm">{doctorNames[p.doctor_id] || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {cls.converted ? (
                          <span>
                            <span className="text-muted-foreground line-through mr-1">{fmt(Number(p.amount), cur)}</span>
                            → {fmt(cls.amount)}
                          </span>
                        ) : fmt(Number(p.amount), cur)}
                      </TableCell>
                      <TableCell className="text-sm">{cls.converted ? fmt(cls.fee_amount) : fmt(Number(p.fee_amount || 0), cur)}</TableCell>
                      <TableCell className="text-sm capitalize">{p.payment_method || "—"}</TableCell>
                      <TableCell><Badge variant={REVENUE_STATUSES.has(p.status) ? "default" : p.status === "failed" ? "destructive" : "secondary"} className="capitalize text-xs">{p.status}</Badge></TableCell>
                      <TableCell>
                        {cls.converted
                          ? <Badge variant="default" className="text-xs bg-emerald-600 hover:bg-emerald-600">Converted</Badge>
                          : mismatch
                            ? <Badge variant="destructive" className="text-xs">Currency mismatch</Badge>
                            : cls.included
                              ? <Badge variant="default" className="text-xs">In revenue</Badge>
                              : <Badge variant="secondary" className="text-xs">Excluded</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Financial Diagnostic Panel (admin)</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setShowDiag((v) => !v)}>
            {showDiag ? "Hide" : "Show"} details
          </Button>
        </CardHeader>
        {showDiag && (
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">
              Shows how each payment is classified for revenue accounting.
              Only rows where <strong>Included = yes</strong> contribute to {PLATFORM_CURRENCY} totals.
            </p>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Payment</TableHead><TableHead>Appointment</TableHead><TableHead>Doctor</TableHead>
                  <TableHead>Patient</TableHead><TableHead>Amount</TableHead><TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead><TableHead>Fee</TableHead><TableHead>Processing</TableHead>
                  <TableHead>Doctor Net</TableHead><TableHead>Included</TableHead><TableHead>Reason</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {classified.slice(0, 200).map((p: any) => {
                    const fee = Number(p.fee_amount || 0);
                    const amt = Number(p.amount || 0);
                    const proc = Number(p.metadata?.processing_fee || 0);
                    const feePct = amt ? ((fee / amt) * 100).toFixed(1) + "%" : "—";
                    const net = amt - fee - proc;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs font-mono">{String(p.id).slice(0, 8)}</TableCell>
                        <TableCell className="text-xs font-mono">{p.appointment_id ? String(p.appointment_id).slice(0, 8) : "—"}</TableCell>
                        <TableCell className="text-xs">{doctorNames[p.doctor_id] || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{p.patient_id ? String(p.patient_id).slice(0, 8) : "—"}</TableCell>
                        <TableCell className="text-xs">{amt.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">{p.currency || "—"}</TableCell>
                        <TableCell className="text-xs capitalize">{p.status}</TableCell>
                        <TableCell className="text-xs">{fee.toFixed(2)} ({feePct})</TableCell>
                        <TableCell className="text-xs">{proc.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">{net.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={p._class.included ? "default" : "secondary"} className="text-xs">
                            {p._class.included ? "yes" : "no"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p._class.reason || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

/* =============== CURRENCY CONVERSION PANEL =============== */
const CurrencyConversionPanel = ({ payments, doctorNames, conversions, convMap, onChange }: any) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ method: "fixed_rate", rate: "", converted_amount: "", include_in_totals: true, note: "" });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkRate, setBulkRate] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Legacy non-ZAR successful payments
  const legacy = useMemo(() => {
    return payments.filter((p: any) =>
      REVENUE_STATUSES.has(p.status) && (p.currency || PLATFORM_CURRENCY) !== PLATFORM_CURRENCY
    );
  }, [payments]);

  const unconverted = legacy.filter((p: any) => !convMap[p.id]);
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  const openConvert = (p: any) => {
    const existing = convMap[p.id];
    setEditing(p);
    setForm({
      method: existing?.conversion_method || "fixed_rate",
      rate: existing ? String(existing.exchange_rate || "") : "",
      converted_amount: existing ? String(existing.converted_amount || "") : "",
      include_in_totals: existing ? !!existing.include_in_totals : true,
      note: existing?.conversion_note || "",
    });
    setOpen(true);
  };

  const computedAmount = useMemo(() => {
    if (!editing) return 0;
    if (form.method === "manual") return Number(form.converted_amount || 0);
    if (form.method === "fixed_rate") return +(Number(editing.amount || 0) * Number(form.rate || 0)).toFixed(2);
    return 0;
  }, [editing, form]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const include = form.method !== "excluded" && form.method !== "test_payment" && !!form.include_in_totals;
    const rate = form.method === "fixed_rate" ? Number(form.rate || 0)
      : form.method === "manual" && Number(editing.amount) > 0 ? +(Number(form.converted_amount || 0) / Number(editing.amount)).toFixed(8)
      : 0;
    const payload: any = {
      payment_id: editing.id,
      original_currency: editing.currency || "UNKNOWN",
      original_amount: Number(editing.amount || 0),
      exchange_rate: rate,
      converted_currency: PLATFORM_CURRENCY,
      converted_amount: include ? computedAmount : 0,
      conversion_method: form.method,
      converted_by: user?.id || null,
      conversion_note: form.note || null,
      include_in_totals: include,
    };
    const existing = convMap[editing.id];
    const { error } = existing
      ? await (supabase as any).from("financial_currency_conversions").update(payload).eq("id", existing.id)
      : await (supabase as any).from("financial_currency_conversions").insert(payload);
    setSaving(false);
    if (error) { toast({ variant: "destructive", title: "Save failed", description: error.message }); return; }
    toast({ title: existing ? "Conversion updated" : "Payment converted" });
    setOpen(false); setEditing(null); onChange();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this conversion record? The original payment will return to mismatched state.")) return;
    const { error } = await (supabase as any).from("financial_currency_conversions").delete().eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Delete failed", description: error.message }); return; }
    toast({ title: "Conversion removed" });
    onChange();
  };

  const handleBulk = async () => {
    const rate = Number(bulkRate);
    if (!rate || rate <= 0) { toast({ variant: "destructive", title: "Enter a valid exchange rate" }); return; }
    if (!selectedIds.length) { toast({ variant: "destructive", title: "Select at least one payment" }); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const rows = selectedIds.map((id) => {
      const p = payments.find((x: any) => x.id === id);
      return {
        payment_id: id,
        original_currency: p.currency || "UNKNOWN",
        original_amount: Number(p.amount || 0),
        exchange_rate: rate,
        converted_currency: PLATFORM_CURRENCY,
        converted_amount: +(Number(p.amount || 0) * rate).toFixed(2),
        conversion_method: "fixed_rate",
        converted_by: user?.id || null,
        conversion_note: bulkNote || null,
        include_in_totals: true,
      };
    });
    const { error } = await (supabase as any).from("financial_currency_conversions").insert(rows);
    setSaving(false);
    if (error) { toast({ variant: "destructive", title: "Bulk conversion failed", description: error.message }); return; }
    toast({ title: `Converted ${rows.length} payment(s)` });
    setBulkOpen(false); setSelected({}); setBulkRate(""); setBulkNote(""); onChange();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 flex-wrap">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><RefreshCcw className="h-4 w-4 text-primary" />Currency Conversion</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Manually convert legacy non-{PLATFORM_CURRENCY} successful payments into {PLATFORM_CURRENCY} so they are included in financial totals. No automatic conversion is performed.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={selectedIds.length === 0} onClick={() => setBulkOpen(true)}>
            Bulk convert ({selectedIds.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Legacy non-ZAR payments" value={legacy.length} icon={AlertTriangle} tone={legacy.length ? "bad" : "default"} />
          <StatCard label="Awaiting conversion" value={unconverted.length} icon={RefreshCcw} tone={unconverted.length ? "bad" : "good"} />
          <StatCard label="Conversions recorded" value={conversions.length} icon={Receipt} />
        </div>

        {legacy.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No legacy non-{PLATFORM_CURRENCY} successful payments found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Converted (ZAR)</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>In totals</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {legacy.map((p: any) => {
                  const c = convMap[p.id];
                  const cur = p.currency || "—";
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        {!c && (
                          <Checkbox
                            checked={!!selected[p.id]}
                            onCheckedChange={(v) => setSelected((s) => ({ ...s, [p.id]: !!v }))}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(p.paid_at || p.created_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="text-sm">{doctorNames[p.doctor_id] || "—"}</TableCell>
                      <TableCell className="text-sm">{fmt(Number(p.amount), cur)}</TableCell>
                      <TableCell className="text-sm">
                        {c ? (c.include_in_totals ? fmt(Number(c.converted_amount)) : <span className="text-muted-foreground">excluded</span>) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs capitalize">{c?.conversion_method?.replace("_", " ") || "—"}</TableCell>
                      <TableCell className="text-xs">{c?.exchange_rate ? Number(c.exchange_rate).toFixed(4) : "—"}</TableCell>
                      <TableCell>
                        {c
                          ? (c.include_in_totals
                              ? <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600">Yes</Badge>
                              : <Badge variant="secondary" className="text-xs">No</Badge>)
                          : <Badge variant="destructive" className="text-xs">Pending</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openConvert(p)}>{c ? "Edit" : "Convert"}</Button>
                        {c && <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Single conversion dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Convert Payment to {PLATFORM_CURRENCY}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div><strong>Original:</strong> {fmt(Number(editing.amount), editing.currency || "—")}</div>
                <div className="text-xs text-muted-foreground">Payment {String(editing.id).slice(0, 8)} · {format(new Date(editing.paid_at || editing.created_at), "MMM dd, yyyy")}</div>
              </div>
              <div>
                <Label>Conversion method</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_rate">Fixed exchange rate</SelectItem>
                    <SelectItem value="manual">Manual ZAR amount</SelectItem>
                    <SelectItem value="excluded">Exclude from totals</SelectItem>
                    <SelectItem value="test_payment">Mark as test payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.method === "fixed_rate" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Exchange rate ({editing.currency || "?"} → ZAR)</Label>
                    <Input type="number" step="0.0001" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="e.g. 0.011" />
                  </div>
                  <div>
                    <Label>Computed ZAR</Label>
                    <Input value={fmt(computedAmount)} disabled />
                  </div>
                </div>
              )}
              {form.method === "manual" && (
                <div>
                  <Label>Converted ZAR amount</Label>
                  <Input type="number" step="0.01" value={form.converted_amount} onChange={(e) => setForm({ ...form, converted_amount: e.target.value })} />
                </div>
              )}
              {(form.method === "fixed_rate" || form.method === "manual") && (
                <div className="flex items-center gap-2">
                  <Checkbox id="incl" checked={form.include_in_totals} onCheckedChange={(v) => setForm({ ...form, include_in_totals: !!v })} />
                  <Label htmlFor="incl" className="font-normal">Include in financial totals</Label>
                </div>
              )}
              <div>
                <Label>Conversion note (optional)</Label>
                <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save conversion"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk conversion dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Bulk convert {selectedIds.length} payment(s)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Applies one exchange rate to every selected payment using the fixed-rate method.</p>
            <div>
              <Label>Exchange rate → ZAR</Label>
              <Input type="number" step="0.0001" value={bulkRate} onChange={(e) => setBulkRate(e.target.value)} placeholder="e.g. 0.011" />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Textarea rows={2} value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulk} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply rate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

/* ===================== EXPENSES TAB ===================== */
const ExpensesTab = ({ expenses, categories, onChange }: { expenses: Expense[]; categories: Category[]; onChange: () => void }) => {
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    expense_date: format(new Date(), "yyyy-MM-dd"),
    category_id: "", supplier: "", description: "",
    amount: "", vat_amount: "0", currency: "ZAR",
    payment_method: "card", status: "paid", notes: "", tax_deductible: true,
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const openNew = () => {
    setEditing(null);
    setForm({ expense_date: format(new Date(), "yyyy-MM-dd"), category_id: "", supplier: "", description: "", amount: "", vat_amount: "0", currency: "ZAR", payment_method: "card", status: "paid", notes: "", tax_deductible: true });
    setReceiptFile(null);
    setOpenDialog(true);
  };
  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({ ...e, amount: String(e.amount), vat_amount: String(e.vat_amount) });
    setReceiptFile(null);
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount) { toast({ variant: "destructive", title: "Description and amount required" }); return; }
    setSaving(true);
    let receipt_path = editing?.receipt_path || null;
    if (receiptFile) {
      const path = `${Date.now()}-${receiptFile.name}`;
      const { error: upErr } = await supabase.storage.from("expense-receipts").upload(path, receiptFile);
      if (upErr) { toast({ variant: "destructive", title: "Upload failed", description: upErr.message }); setSaving(false); return; }
      receipt_path = path;
    }
    const payload: any = {
      expense_date: form.expense_date,
      category_id: form.category_id || null,
      supplier: form.supplier || null,
      description: form.description,
      amount: Number(form.amount),
      vat_amount: Number(form.vat_amount || 0),
      currency: form.currency,
      payment_method: form.payment_method,
      status: form.status,
      notes: form.notes || null,
      tax_deductible: !!form.tax_deductible,
      receipt_path,
    };
    let err;
    if (editing) {
      ({ error: err } = await supabase.from("expenses").update(payload).eq("id", editing.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      payload.created_by = user?.id;
      ({ error: err } = await supabase.from("expenses").insert(payload));
    }
    setSaving(false);
    if (err) { toast({ variant: "destructive", title: "Save failed", description: err.message }); return; }
    toast({ title: editing ? "Expense updated" : "Expense added" });
    setOpenDialog(false); onChange();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: "Delete failed", description: error.message });
    else { toast({ title: "Deleted" }); onChange(); }
  };

  const viewReceipt = async (path: string) => {
    const { data, error } = await supabase.storage.from("expense-receipts").createSignedUrl(path, 60);
    if (error) { toast({ variant: "destructive", title: "Cannot open receipt", description: error.message }); return; }
    window.open(data.signedUrl, "_blank");
  };

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Expenses</CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Expense</Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Supplier</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>VAT</TableHead><TableHead>Status</TableHead><TableHead>Receipt</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No expenses recorded</TableCell></TableRow>
              ) : expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(e.expense_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-sm">{e.category_id ? catMap[e.category_id]?.name || "—" : "—"}</TableCell>
                  <TableCell className="text-sm">{e.supplier || "—"}</TableCell>
                  <TableCell className="text-sm max-w-[260px] truncate">{e.description}</TableCell>
                  <TableCell className="text-sm font-medium">{fmt(e.amount, e.currency)}</TableCell>
                  <TableCell className="text-sm">{fmt(e.vat_amount, e.currency)}</TableCell>
                  <TableCell><Badge variant={e.status === "paid" ? "default" : e.status === "overdue" ? "destructive" : "secondary"} className="capitalize text-xs">{e.status}</Badge></TableCell>
                  <TableCell>{e.receipt_path ? <Button size="sm" variant="ghost" onClick={() => viewReceipt(e.receipt_path!)}><FileText className="h-4 w-4" /></Button> : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Expense" : "New Expense"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
            <div><Label>Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.parent_group} — {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Supplier</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
            <div><Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="eft">EFT</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="debit_order">Debit Order</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>VAT Amount</Label><Input type="number" step="0.01" value={form.vat_amount} onChange={(e) => setForm({ ...form, vat_amount: e.target.value })} /></div>
            <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Receipt (PDF / Image)</Label><Input type="file" accept=".pdf,image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
              {editing?.receipt_path && !receiptFile && <p className="text-xs text-muted-foreground mt-1">Existing receipt attached. Upload a new file to replace.</p>}
            </div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" id="td" checked={form.tax_deductible} onChange={(e) => setForm({ ...form, tax_deductible: e.target.checked })} />
              <Label htmlFor="td" className="cursor-pointer">Tax deductible</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

/* ===================== RECURRING TAB ===================== */
const RecurringTab = ({ recurring, categories, onChange }: { recurring: Recurring[]; categories: Category[]; onChange: () => void }) => {
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [form, setForm] = useState<any>({
    category_id: "", supplier: "", description: "", amount: "",
    currency: "ZAR", frequency: "monthly",
    next_due_date: format(new Date(), "yyyy-MM-dd"),
    reminder_days: 7, is_active: true, notes: "",
  });

  const openNew = () => { setEditing(null); setForm({ category_id: "", supplier: "", description: "", amount: "", currency: "ZAR", frequency: "monthly", next_due_date: format(new Date(), "yyyy-MM-dd"), reminder_days: 7, is_active: true, notes: "" }); setOpenDialog(true); };
  const openEdit = (r: Recurring) => { setEditing(r); setForm({ ...r, amount: String(r.amount) }); setOpenDialog(true); };

  const handleSave = async () => {
    if (!form.description || !form.amount) { toast({ variant: "destructive", title: "Description and amount required" }); return; }
    const payload: any = { ...form, amount: Number(form.amount), reminder_days: Number(form.reminder_days), category_id: form.category_id || null };
    let err;
    if (editing) ({ error: err } = await supabase.from("recurring_expenses").update(payload).eq("id", editing.id));
    else {
      const { data: { user } } = await supabase.auth.getUser();
      payload.created_by = user?.id;
      ({ error: err } = await supabase.from("recurring_expenses").insert(payload));
    }
    if (err) { toast({ variant: "destructive", title: "Save failed", description: err.message }); return; }
    toast({ title: editing ? "Updated" : "Added" });
    setOpenDialog(false); onChange();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete recurring expense?")) return;
    const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: "Delete failed", description: error.message });
    else { toast({ title: "Deleted" }); onChange(); }
  };

  const logPayment = async (r: Recurring) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error: insErr } = await supabase.from("expenses").insert({
      expense_date: r.next_due_date,
      category_id: r.category_id, supplier: r.supplier,
      description: r.description, amount: r.amount, currency: r.currency,
      payment_method: "debit_order", status: "paid",
      recurring_expense_id: r.id, created_by: user?.id,
    });
    if (insErr) { toast({ variant: "destructive", title: "Failed", description: insErr.message }); return; }
    // advance next_due_date
    const d = new Date(r.next_due_date);
    const next = r.frequency === "yearly" ? addYears(d, 1) : r.frequency === "weekly" ? addWeeks(d, 1) : r.frequency === "quarterly" ? addMonths(d, 3) : addMonths(d, 1);
    await supabase.from("recurring_expenses").update({ next_due_date: format(next, "yyyy-MM-dd") }).eq("id", r.id);
    toast({ title: "Payment logged" });
    onChange();
  };

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const today = startOfDay(new Date());

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Repeat className="h-5 w-5 text-primary" />Recurring Expenses</CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Recurring</Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>Amount</TableHead><TableHead>Frequency</TableHead><TableHead>Next Due</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {recurring.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No recurring expenses</TableCell></TableRow>
              ) : recurring.map((r) => {
                const due = new Date(r.next_due_date);
                const daysToDue = Math.ceil((due.getTime() - today.getTime()) / 86400000);
                const overdue = daysToDue < 0;
                const dueSoon = daysToDue >= 0 && daysToDue <= r.reminder_days;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{r.description}<br /><span className="text-xs text-muted-foreground">{r.supplier}</span></TableCell>
                    <TableCell className="text-sm">{r.category_id ? catMap[r.category_id]?.name || "—" : "—"}</TableCell>
                    <TableCell className="text-sm">{fmt(r.amount, r.currency)}</TableCell>
                    <TableCell className="text-sm capitalize">{r.frequency}</TableCell>
                    <TableCell className="text-sm">
                      {format(due, "MMM dd, yyyy")}
                      {overdue && <Badge variant="destructive" className="ml-2 text-xs gap-1"><AlertTriangle className="h-3 w-3" />Overdue</Badge>}
                      {!overdue && dueSoon && <Badge variant="secondary" className="ml-2 text-xs">Due soon</Badge>}
                    </TableCell>
                    <TableCell><Badge variant={r.is_active ? "default" : "secondary"} className="text-xs">{r.is_active ? "Active" : "Paused"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="mr-1" onClick={() => logPayment(r)}>Log paid</Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Recurring Expense" : "New Recurring Expense"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Supabase Pro plan" /></div>
            <div><Label>Supplier</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
            <div><Label>Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.parent_group} — {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
            <div><Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Next Due Date</Label><Input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} /></div>
            <div><Label>Reminder Days Before</Label><Input type="number" value={form.reminder_days} onChange={(e) => setForm({ ...form, reminder_days: e.target.value })} /></div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" id="ra" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              <Label htmlFor="ra" className="cursor-pointer">Active</Label>
            </div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

/* ===================== CATEGORIES TAB ===================== */
const CategoriesTab = ({ categories, onChange }: { categories: Category[]; onChange: () => void }) => {
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", parent_group: "Other", sort_order: 0, is_active: true });

  const openNew = () => { setEditing(null); setForm({ name: "", parent_group: "Other", sort_order: 0, is_active: true }); setOpenDialog(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, parent_group: c.parent_group, sort_order: c.sort_order, is_active: c.is_active }); setOpenDialog(true); };

  const handleSave = async () => {
    if (!form.name) { toast({ variant: "destructive", title: "Name required" }); return; }
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let err;
    if (editing) ({ error: err } = await supabase.from("expense_categories").update({ ...form }).eq("id", editing.id));
    else ({ error: err } = await supabase.from("expense_categories").insert({ ...form, slug }));
    if (err) { toast({ variant: "destructive", title: "Save failed", description: err.message }); return; }
    toast({ title: editing ? "Updated" : "Added" });
    setOpenDialog(false); onChange();
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("expense_categories").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: "Delete failed", description: error.message });
    else { toast({ title: "Deleted" }); onChange(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Expense Categories</CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Category</Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Group</TableHead><TableHead>Name</TableHead><TableHead>Order</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm font-medium">{c.parent_group}</TableCell>
                  <TableCell className="text-sm">{c.name}</TableCell>
                  <TableCell className="text-sm">{c.sort_order}</TableCell>
                  <TableCell><Badge variant={c.is_active ? "default" : "secondary"} className="text-xs">{c.is_active ? "Yes" : "No"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Group</Label>
              <Select value={form.parent_group} onValueChange={(v) => setForm({ ...form, parent_group: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Technology", "Operations", "Marketing", "Administration", "Other"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2"><input type="checkbox" id="ca" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /><Label htmlFor="ca">Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

/* ===================== P&L TAB ===================== */
const PLTab = ({ trend }: { trend: any[] }) => {
  const totals = trend.reduce((acc, t) => ({ revenue: acc.revenue + t.revenue, expenses: acc.expenses + t.expenses }), { revenue: 0, expenses: 0 });
  const quarterly = useMemo(() => {
    const q: Record<string, any> = {};
    trend.forEach((t) => {
      const [mon, yr] = t.month.split(" ");
      const monthIdx = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(mon);
      const qNum = Math.floor(monthIdx / 3) + 1;
      const key = `Q${qNum} ${yr}`;
      if (!q[key]) q[key] = { period: key, revenue: 0, expenses: 0, profit: 0 };
      q[key].revenue += t.revenue; q[key].expenses += t.expenses; q[key].profit += t.profit;
    });
    return Object.values(q);
  }, [trend]);

  return (
    <>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <StatCard label="12-Month Revenue" value={fmt(totals.revenue)} icon={TrendingUp} tone="good" />
        <StatCard label="12-Month Expenses" value={fmt(totals.expenses)} icon={TrendingDown} tone="bad" />
        <StatCard label="12-Month Gross Profit" value={fmt(totals.revenue - totals.expenses)} icon={Wallet} tone={totals.revenue - totals.expenses >= 0 ? "good" : "bad"} />
      </div>
      <Card>
        <CardHeader><CardTitle>Monthly P&L</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Revenue</TableHead><TableHead>Expenses</TableHead><TableHead>Gross Profit</TableHead><TableHead>Margin</TableHead></TableRow></TableHeader>
              <TableBody>
                {trend.map((t: any) => (
                  <TableRow key={t.month}>
                    <TableCell className="text-sm">{t.month}</TableCell>
                    <TableCell className="text-sm">{fmt(t.revenue)}</TableCell>
                    <TableCell className="text-sm">{fmt(t.expenses)}</TableCell>
                    <TableCell className={`text-sm font-medium ${t.profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(t.profit)}</TableCell>
                    <TableCell className="text-sm">{t.revenue > 0 ? `${((t.profit / t.revenue) * 100).toFixed(1)}%` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Quarterly P&L</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Quarter</TableHead><TableHead>Revenue</TableHead><TableHead>Expenses</TableHead><TableHead>Profit</TableHead></TableRow></TableHeader>
              <TableBody>
                {quarterly.map((q: any) => (
                  <TableRow key={q.period}>
                    <TableCell className="text-sm">{q.period}</TableCell>
                    <TableCell className="text-sm">{fmt(q.revenue)}</TableCell>
                    <TableCell className="text-sm">{fmt(q.expenses)}</TableCell>
                    <TableCell className={`text-sm font-medium ${q.profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(q.profit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AdminFinancialManagement;
