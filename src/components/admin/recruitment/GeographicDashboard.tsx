import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import ExportMenu from "./ExportMenu";

export default function GeographicDashboard() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_recruitment_geo" as any);
      setRows((data as any[]) || []);
      setLoading(false);
    })();
  }, []);

  const byProvince = useMemo(() => {
    const m: Record<string, { total: number; verified: number; founding: number }> = {};
    rows.forEach((r) => {
      const p = r.province || "Unknown";
      const entry = m[p] || (m[p] = { total: 0, verified: 0, founding: 0 });
      entry.total += Number(r.total);
      entry.verified += Number(r.verified);
      entry.founding += Number(r.founding);
    });
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total);
  }, [rows]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportMenu
          filename="recruitment-geo"
          columns={[
            { key: "province", label: "Province" },
            { key: "city", label: "City" },
            { key: "specialty", label: "Specialty" },
            { key: "total", label: "Total" },
            { key: "verified", label: "Verified" },
            { key: "founding", label: "Founding" },
          ]}
          rows={rows}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {byProvince.map(([prov, s]) => (
          <Card key={prov}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{prov}</p>
              <p className="text-2xl font-bold">{s.total}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.verified} verified · {s.founding} founding</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Province</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Verified</TableHead>
              <TableHead className="text-right">Founding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.province}</TableCell>
                <TableCell>{r.city}</TableCell>
                <TableCell>{r.specialty}</TableCell>
                <TableCell className="text-right">{r.total}</TableCell>
                <TableCell className="text-right">{r.verified}</TableCell>
                <TableCell className="text-right">{r.founding}</TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No recruitment data yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
