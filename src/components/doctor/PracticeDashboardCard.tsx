import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight } from "lucide-react";
import { usePractice } from "@/hooks/usePractice";
import { supabase } from "@/integrations/supabase/client";

interface Props { userId: string }

const PracticeDashboardCard = ({ userId }: Props) => {
  const navigate = useNavigate();
  const { practice, loading } = usePractice(userId);
  const [counts, setCounts] = useState({ doctors: 0, staff: 0, appointments: 0, activePatients: 0 });

  useEffect(() => {
    if (!practice) return;
    (async () => {
      const { data: doctorRows } = await supabase.from("doctors").select("profile_id").eq("practice_id", practice.id);
      const doctorIds = (doctorRows || []).map((d) => d.profile_id);
      const { data: memberRows } = await supabase.from("practice_members").select("role").eq("practice_id", practice.id);
      const doctors = (memberRows || []).filter((m) => m.role === "doctor" || m.role === "owner").length;
      const staff = (memberRows || []).filter((m) => ["nurse", "receptionist", "practice_admin"].includes(m.role)).length;
      let appointments = 0, activePatients = 0;
      if (doctorIds.length) {
        const { count } = await supabase.from("appointments").select("id", { count: "exact", head: true }).in("doctor_id", doctorIds);
        appointments = count || 0;
        const { data: pats } = await supabase.from("appointments").select("patient_id").in("doctor_id", doctorIds).in("status", ["confirmed", "completed", "pending"]);
        activePatients = new Set((pats || []).map((p) => p.patient_id)).size;
      }
      setCounts({ doctors, staff, appointments, activePatients });
    })();
  }, [practice]);

  if (loading) return null;

  if (!practice) {
    return (
      <Card className="mb-6 border-dashed">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">Run a practice?</div>
              <div className="text-xs text-muted-foreground">Register a Practice Account to manage your team.</div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/practice/setup")}>Set up practice <ArrowRight className="ml-1 h-4 w-4" /></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">{practice.practice_name}</div>
              <div className="text-xs text-muted-foreground">Practice #{practice.practice_number}</div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/practice/team")}>Manage team</Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Doctors", counts.doctors],
            ["Staff", counts.staff],
            ["Appointments", counts.appointments],
            ["Active Patients", counts.activePatients],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-muted/40 p-3">
              <div className="text-xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PracticeDashboardCard;
