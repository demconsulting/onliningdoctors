import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  service_code: string | null;
  payment_method: string | null;
  paystack_reference: string | null;
  paid_at: string | null;
  created_at: string;
  payer_id: string | null;
  website_invoice_id: string | null;
}

const money = (v: number, c = "ZAR") =>
  `${c === "ZAR" ? "R" : c + " "}${Number(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusVariant = (s: string) => (s === "success" ? "default" : s === "failed" ? "destructive" : "secondary");

const NalavationPayments = () => {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("payments")
        .select("id,amount,currency,status,service_code,payment_method,paystack_reference,paid_at,created_at,payer_id,website_invoice_id")
        .eq("business_unit", "nalavation")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data ?? []) as PaymentRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.service_code, r.paystack_reference, r.status, r.payment_method].some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  const collected = filtered.filter((r) => r.status === "success").reduce((s, r) => s + Number(r.amount || 0), 0);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card className="border-border">
      <CardHeader className="gap-3">
        <div>
          <CardTitle className="font-display text-lg">Service Payments</CardTitle>
          <CardDescription>
            Payments for Nalavation digital services only — patient and consultation payments stay in DoctorsOnlining.
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input placeholder="Search reference, service or status" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
          <p className="text-sm text-muted-foreground">Collected: <span className="font-semibold text-foreground">{money(collected)}</span></p>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No Nalavation payments recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{new Date(r.paid_at ?? r.created_at).toLocaleDateString("en-ZA")}</TableCell>
                  <TableCell>{r.service_code ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.paystack_reference ?? "—"}</TableCell>
                  <TableCell>{r.payment_method ?? "—"}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{money(Number(r.amount), r.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default NalavationPayments;
