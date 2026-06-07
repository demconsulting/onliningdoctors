import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import ExportMenu from "./ExportMenu";

export default function DoctorSuccessTable() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_doctor_success_list" as any);
      setRows((data as any[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  const fmt = (d: any) => (d ? format(new Date(d), "yyyy-MM-dd") : "—");

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportMenu
          filename="doctor-success-report"
          columns={[
            { key: "full_name", label: "Doctor" },
            { key: "email", label: "Email" },
            { key: "registration_date", label: "Registered" },
            { key: "verification_date", label: "Verified" },
            { key: "activated_at", label: "Activated" },
            { key: "first_consultation_at", label: "First Consult" },
            { key: "last_activity_at", label: "Last Activity" },
            { key: "total_consultations", label: "Consults" },
            { key: "status", label: "Status" },
          ]}
          rows={rows}
        />
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Doctor</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Activated</TableHead>
              <TableHead>First Consult</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Consults</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.doctor_id}>
                <TableCell>
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </TableCell>
                <TableCell>{fmt(r.registration_date)}</TableCell>
                <TableCell>{fmt(r.verification_date)}</TableCell>
                <TableCell>{fmt(r.activated_at)}</TableCell>
                <TableCell>{fmt(r.first_consultation_at)}</TableCell>
                <TableCell>{fmt(r.last_activity_at)}</TableCell>
                <TableCell>{r.total_consultations}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "active_doctor" ? "default" : "outline"}>{r.status}</Badge>
                  {r.is_founding_doctor && <Badge className="ml-1 bg-amber-500">Founding</Badge>}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No doctors yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
