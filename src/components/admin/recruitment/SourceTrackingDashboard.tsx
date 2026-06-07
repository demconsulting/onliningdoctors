import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trophy } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import ExportMenu from "./ExportMenu";

const SOURCE_LABELS: Record<string, string> = {
  referral: "Referral",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  medical_centre: "Medical Centre",
  facebook: "Facebook",
  website: "Website",
  event: "Event",
  other: "Other",
  unknown: "Unknown",
};

export default function SourceTrackingDashboard() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_recruitment_source_stats" as any);
      setRows((data as any[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const top = [...rows].sort((a, b) => Number(b.conversion_pct) - Number(a.conversion_pct))[0];
  const chartData = rows.map((r) => ({ source: SOURCE_LABELS[r.source] || r.source, total: Number(r.total), verified: Number(r.verified) }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportMenu
          filename="recruitment-sources"
          columns={[
            { key: "source", label: "Source" },
            { key: "total", label: "Total" },
            { key: "registered", label: "Registered" },
            { key: "verified", label: "Verified" },
            { key: "conversion_pct", label: "Conversion %" },
          ]}
          rows={rows.map((r) => ({ ...r, source: SOURCE_LABELS[r.source] || r.source }))}
        />
      </div>
      {top && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-amber-500" /> Top Performing Source</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{SOURCE_LABELS[top.source] || top.source}</p>
            <p className="text-sm text-muted-foreground">{top.conversion_pct}% conversion · {top.total} total prospects</p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Doctors Recruited by Source</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="source" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" fill="hsl(var(--primary))" />
              <Bar dataKey="verified" fill="hsl(var(--accent))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Registered</TableHead>
              <TableHead className="text-right">Verified</TableHead>
              <TableHead className="text-right">Conversion %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.source}>
                <TableCell>{SOURCE_LABELS[r.source] || r.source}</TableCell>
                <TableCell className="text-right">{r.total}</TableCell>
                <TableCell className="text-right">{r.registered}</TableCell>
                <TableCell className="text-right">{r.verified}</TableCell>
                <TableCell className="text-right">{r.conversion_pct}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
