import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, History, Search, Download, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { getPlatformFeeTiers, computePlatformFee, type FeeSettings, type PlatformFeeTier } from "@/lib/feeCalculator";

const money = (n: number, currency = "ZAR") =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(n || 0);

const bandLabel = (tiers: PlatformFeeTier[], index: number) => {
  const t = tiers[index];
  if (!t) return "No band";
  const lower = index === 0 ? 0 : tiers[index - 1].max_amount ?? 0;
  return t.max_amount === null
    ? `${money(lower)}+ → ${money(t.fee)}`
    : `${money(lower)}–${money(t.max_amount)} → ${money(t.fee)}`;
};

const bandIndexFor = (amount: number, tiers: PlatformFeeTier[]) =>
  tiers.findIndex((t) => t.max_amount === null || amount < t.max_amount);

const AdminFeeHistory = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [bandFilter, setBandFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const [{ data: payments }, { data: plan }] = await Promise.all([
        supabase
          .from("payments")
          .select("*")
          .eq("business_unit", "doctorsonlining")
          .eq("status", "success")
          .order("paid_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
        supabase.from("platform_fee_settings").select("*").eq("is_default", true).maybeSingle(),
      ]);

      setSettings((plan as unknown as FeeSettings) ?? null);
      const list = payments ?? [];
      setRows(list);

      const ids = [...new Set(list.flatMap((p: any) => [p.doctor_id, p.patient_id]).filter(Boolean))];
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids as string[]);
        const map: Record<string, string> = {};
        (profiles ?? []).forEach((p: any) => (map[p.id] = p.full_name || "Unknown"));
        setNames(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  const tiers = useMemo(() => (settings ? getPlatformFeeTiers(settings) : []), [settings]);

  const enriched = useMemo(() => {
    return rows.map((p) => {
      const amount = Number(p.amount) || 0;
      const idx = tiers.length ? bandIndexFor(amount, tiers) : -1;
      const expected = settings ? computePlatformFee(amount, settings) : null;
      const charged = p.platform_fee_amount === null || p.platform_fee_amount === undefined ? null : Number(p.platform_fee_amount);
      const drift = expected !== null && charged !== null && Math.abs(expected - charged) > 0.009;
      return { ...p, amount, bandIdx: idx, expected, charged, drift };
    });
  }, [rows, tiers, settings]);

  const filtered = useMemo(() => {
    return enriched.filter((p) => {
      if (bandFilter !== "all" && String(p.bandIdx) !== bandFilter) return false;
      const when = p.paid_at || p.created_at;
      if (dateFrom && when < dateFrom) return false;
      if (dateTo && when > `${dateTo}T23:59:59`) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${names[p.doctor_id] || ""} ${names[p.patient_id] || ""} ${p.paystack_reference || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [enriched, bandFilter, dateFrom, dateTo, search, names]);

  const summary = useMemo(() => {
    return tiers.map((_, i) => {
      const inBand = filtered.filter((p) => p.bandIdx === i);
      return {
        label: bandLabel(tiers, i),
        count: inBand.length,
        platform: inBand.reduce((s, p) => s + (p.charged ?? p.expected ?? 0), 0),
      };
    });
  }, [filtered, tiers]);

  const exportCsv = () => {
    const header = ["Date", "Doctor", "Patient", "Consultation fee", "Band", "Platform fee charged", "Platform fee (current band)", "Processing fee", "Doctor net", "Reference"];
    const lines = filtered.map((p) => [
      format(new Date(p.paid_at || p.created_at), "yyyy-MM-dd HH:mm"),
      names[p.doctor_id] || "",
      names[p.patient_id] || "",
      p.amount,
      p.bandIdx >= 0 ? bandLabel(tiers, p.bandIdx) : "",
      p.charged ?? "",
      p.expected ?? "",
      p.processing_fee_amount ?? "",
      p.doctor_net_amount ?? "",
      p.paystack_reference || "",
    ]);
    const csv = [header, ...lines].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `fee-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" /> Fee History
          </h1>
          <p className="text-sm text-muted-foreground">
            Every completed booking with the fee band that applied, so you can track how fees change over time.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.count}</div>
              <p className="text-xs text-muted-foreground">{money(s.platform)} platform fees</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="text-base">Bookings ({filtered.length})</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Doctor, patient or reference" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={bandFilter} onValueChange={setBandFilter}>
              <SelectTrigger><SelectValue placeholder="All bands" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All bands</SelectItem>
                {tiers.map((_, i) => (
                  <SelectItem key={i} value={String(i)}>{bandLabel(tiers, i)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="text-right">Consultation</TableHead>
                  <TableHead>Band</TableHead>
                  <TableHead className="text-right">Platform fee</TableHead>
                  <TableHead className="text-right">Processing fee</TableHead>
                  <TableHead className="text-right">Doctor net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No bookings match these filters.</TableCell>
                  </TableRow>
                )}
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(p.paid_at || p.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell>{names[p.doctor_id] || "—"}</TableCell>
                    <TableCell>{names[p.patient_id] || "—"}</TableCell>
                    <TableCell className="text-right">{money(p.amount, p.currency)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.bandIdx >= 0 ? bandLabel(tiers, p.bandIdx) : "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.drift && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                        <span>{p.charged !== null ? money(p.charged, p.currency) : "—"}</span>
                      </div>
                      {p.drift && (
                        <div className="text-xs text-muted-foreground">now {money(p.expected!, p.currency)}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{p.processing_fee_amount !== null ? money(Number(p.processing_fee_amount), p.currency) : "—"}</TableCell>
                    <TableCell className="text-right">{p.doctor_net_amount !== null ? money(Number(p.doctor_net_amount), p.currency) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> A warning means the fee charged at the time differs from today's band for that price.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFeeHistory;
