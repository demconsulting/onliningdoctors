import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import ExportMenu from "./ExportMenu";

const FEATURE_LABELS: Record<string, string> = {
  practice_management: "Practice Management",
  financial_management: "Financial Management",
  medical_aid_automation: "Medical Aid Automation",
  tax_reports: "Tax Reports",
  bank_reconciliation: "Bank Reconciliation",
  enterprise_tools: "Enterprise Practice Tools",
};

export default function EarlyAccessInterestList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("recruitment_early_access_interest" as any).select("*").order("created_at", { ascending: false });
      setRows((data as any[]) || []);
      setLoading(false);
    })();
  }, []);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    Object.keys(FEATURE_LABELS).forEach((k) => (m[k] = 0));
    rows.forEach((r) => (m[r.feature_key] = (m[r.feature_key] || 0) + 1));
    return m;
  }, [rows]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportMenu
          filename="early-access-interest"
          columns={[
            { key: "feature_key", label: "Feature" },
            { key: "email", label: "Email" },
            { key: "notes", label: "Notes" },
            { key: "created_at", label: "Date" },
          ]}
          rows={rows.map((r) => ({ ...r, feature_key: FEATURE_LABELS[r.feature_key] || r.feature_key }))}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(FEATURE_LABELS).map(([k, label]) => (
          <Card key={k}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{counts[k] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{FEATURE_LABELS[r.feature_key] || r.feature_key}</TableCell>
                <TableCell>{r.email || "—"}</TableCell>
                <TableCell className="max-w-[300px] truncate">{r.notes || "—"}</TableCell>
                <TableCell>{format(new Date(r.created_at), "yyyy-MM-dd")}</TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No early-access interest yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
