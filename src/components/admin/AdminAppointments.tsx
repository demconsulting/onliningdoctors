import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-muted text-muted-foreground border-border",
  doctor_no_show: "bg-destructive/10 text-destructive border-destructive/20",
};

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Admin can view appointments through doctor_id or patient_id if they have those roles
    // For full admin access, we'd need a security definer function
    supabase
      .from("appointments")
      .select("*, patient:patient_id(full_name), doctor:doctor_id(full_name)")
      .order("scheduled_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setAppointments(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Calendar className="h-5 w-5 text-primary" /> Appointments ({appointments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4">Patient</th>
                <th className="pb-2 pr-4">Doctor</th>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {appointments.map((a) => (
                <tr key={a.id} className="text-foreground">
                  <td className="py-2 pr-4">{a.patient?.full_name || "—"}</td>
                  <td className="py-2 pr-4">{a.doctor?.full_name || "—"}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{format(new Date(a.scheduled_at), "MMM d, yyyy h:mm a")}</td>
                  <td className="py-2 pr-4">
                    <Badge variant="outline" className={statusColors[a.status] || ""}>{a.status}</Badge>
                  </td>
                  <td className="py-2 text-muted-foreground text-xs max-w-48 truncate">{a.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAppointments;
