import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface LogRow {
  id: string;
  created_at: string;
  action_type: string;
  record_type: string;
  actor_id: string;
  actor_name: string | null;
  target_patient_id: string | null;
  patient_name: string | null;
}

const AdminMedicalAuditLogs = () => {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await (supabase.rpc as any)("admin_medical_audit_logs", { _limit: 1000 });
    if (error) setError(error.message);
    setRows((data as LogRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const s = search.toLowerCase();
  const filtered = rows.filter((r) =>
    !s || [r.actor_name, r.patient_name, r.action_type, r.record_type].some((v) => (v || "").toLowerCase().includes(s)),
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="font-display">Medical Audit Logs</CardTitle>
          <p className="text-sm text-muted-foreground">Compliance history of who accessed patient data. Entries cannot be edited or deleted.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </CardHeader>
      <CardContent>
        <Input placeholder="Search doctor, patient, action or record type" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-md" />
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : error ? (
          <p className="py-6 text-sm text-destructive">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No audit entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">When</th><th className="py-2 pr-3">Actor</th><th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Record</th><th className="py-2">Patient</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">{r.actor_name || r.actor_id.slice(0, 8)}</td>
                    <td className="py-2 pr-3"><Badge variant="outline">{r.action_type}</Badge></td>
                    <td className="py-2 pr-3">{r.record_type}</td>
                    <td className="py-2">{r.patient_name || r.target_patient_id?.slice(0, 8) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminMedicalAuditLogs;
