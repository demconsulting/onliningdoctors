import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

const money = (v: number) => `R${Number(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Totals {
  collected: number;
  outstanding: number;
  mrr: number;
  arr: number;
  byCategory: { category: string; invoiced: number; collected: number }[];
  byMonth: { month: string; collected: number }[];
}

const NalavationRevenue = () => {
  const [t, setT] = useState<Totals | null>(null);

  useEffect(() => {
    const load = async () => {
      const [invoicesRes, paymentsRes, subsRes] = await Promise.all([
        supabase.from("website_invoices").select("total_amount,status,category,paid_at"),
        supabase.from("payments").select("amount,status,paid_at,created_at").eq("business_unit", "nalavation"),
        supabase.from("service_subscriptions").select("amount,billing_cycle,status").eq("business_unit", "nalavation"),
      ]);

      const invoices = invoicesRes.data ?? [];
      const payments = paymentsRes.data ?? [];
      const subs = subsRes.data ?? [];

      const mrr = subs
        .filter((s) => s.status === "active")
        .reduce((sum, s) => sum + Number(s.amount || 0) / (s.billing_cycle === "annual" ? 12 : s.billing_cycle === "quarterly" ? 3 : 1), 0);

      const catMap = new Map<string, { invoiced: number; collected: number }>();
      invoices.forEach((i) => {
        const key = String(i.category ?? "other");
        const cur = catMap.get(key) ?? { invoiced: 0, collected: 0 };
        cur.invoiced += Number(i.total_amount || 0);
        if (i.status === "paid") cur.collected += Number(i.total_amount || 0);
        catMap.set(key, cur);
      });

      const monthMap = new Map<string, number>();
      payments
        .filter((p) => p.status === "success")
        .forEach((p) => {
          const d = new Date(p.paid_at ?? p.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthMap.set(key, (monthMap.get(key) ?? 0) + Number(p.amount || 0));
        });

      setT({
        collected: payments.filter((p) => p.status === "success").reduce((s, p) => s + Number(p.amount || 0), 0),
        outstanding: invoices.filter((i) => ["sent", "overdue", "draft"].includes(String(i.status))).reduce((s, i) => s + Number(i.total_amount || 0), 0),
        mrr,
        arr: mrr * 12,
        byCategory: [...catMap.entries()].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.invoiced - a.invoiced),
        byMonth: [...monthMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12).map(([month, collected]) => ({ month, collected })),
      });
    };
    load();
  }, []);

  if (!t) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const kpis = [
    { label: "Collected (gateway)", value: money(t.collected) },
    { label: "Outstanding invoices", value: money(t.outstanding) },
    { label: "Monthly recurring revenue", value: money(t.mrr) },
    { label: "Annual run rate", value: money(t.arr) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle></CardHeader>
            <CardContent><p className="font-display text-2xl font-bold">{k.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Revenue by service category</CardTitle>
          <CardDescription>Invoiced versus collected across Nalavation services.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {t.byCategory.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Invoiced</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {t.byCategory.map((c) => (
                  <TableRow key={c.category}>
                    <TableCell className="capitalize">{c.category}</TableCell>
                    <TableCell className="text-right">{money(c.invoiced)}</TableCell>
                    <TableCell className="text-right">{money(c.collected)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Monthly collections</CardTitle>
          <CardDescription>Successful Nalavation gateway payments per month.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {t.byMonth.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No payments collected yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {t.byMonth.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell>{m.month}</TableCell>
                    <TableCell className="text-right">{money(m.collected)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NalavationRevenue;
