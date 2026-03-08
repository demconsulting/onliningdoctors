import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Loader2, Video, Star, Pencil } from "lucide-react";
import { format } from "date-fns";
import type { User as SupaUser } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import ReviewForm from "@/components/reviews/ReviewForm";
import DocumentSharingToggle from "@/components/patient/DocumentSharingToggle";

interface AppointmentListProps {
  user: SupaUser;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-muted text-muted-foreground border-border",
};

const AppointmentList = ({ user }: AppointmentListProps) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [reviewsMap, setReviewsMap] = useState<Record<string, any>>({});
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchAppointments = async () => {
    const [aptRes, reviewRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("*, doctor:doctor_id(full_name, avatar_url)")
        .eq("patient_id", user.id)
        .order("scheduled_at", { ascending: false }),
      supabase
        .from("reviews")
        .select("id, appointment_id, rating, comment, created_at")
        .eq("patient_id", user.id),
    ]);

    if (aptRes.data) setAppointments(aptRes.data);
    if (aptRes.error) console.error(aptRes.error);
    if (reviewRes.data) {
      setReviewedIds(new Set(reviewRes.data.map((r: any) => r.appointment_id)));
      const map: Record<string, any> = {};
      reviewRes.data.forEach((r: any) => { map[r.appointment_id] = r; });
      setReviewsMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, [user.id]);

  const handleCancel = async (id: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("patient_id", user.id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Appointment cancelled" });
      fetchAppointments();
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Calendar className="h-5 w-5 text-primary" /> My Appointments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p>No appointments yet</p>
            <p className="text-sm">Book your first appointment with a doctor</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div key={apt.id} className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {apt.doctor?.full_name || "Doctor"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(apt.scheduled_at), "MMM d, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(apt.scheduled_at), "h:mm a")}
                      </span>
                      <span>{apt.duration_minutes} min</span>
                    </div>
                    {apt.reason && <p className="mt-1 text-xs text-muted-foreground">{apt.reason}</p>}
                  </div>
                </div>
                {(() => {
                  const aptEnd = new Date(new Date(apt.scheduled_at).getTime() + (apt.duration_minutes || 30) * 60000);
                  const isExpired = Date.now() > aptEnd.getTime() + 30 * 60000;
                  const displayStatus = isExpired && (apt.status === "pending" || apt.status === "confirmed") ? "expired" : apt.status;
                  return (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={displayStatus === "expired" ? "bg-muted text-muted-foreground border-border" : (statusColors[apt.status] || "")}>
                        {displayStatus === "expired" ? "past" : apt.status}
                      </Badge>
                      {!isExpired && apt.status === "confirmed" && (
                        <Button variant="outline" size="sm" className="gap-1 text-primary" onClick={() => navigate(`/call/${apt.id}`)}>
                          <Video className="h-3.5 w-3.5" /> Join Call
                        </Button>
                      )}
                      {!isExpired && (apt.status === "pending" || apt.status === "confirmed") && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleCancel(apt.id)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  );
                })()}
                {/* Document sharing toggle for active appointments */}
                {(apt.status === "pending" || apt.status === "confirmed" || apt.status === "completed") && (
                  <DocumentSharingToggle
                    patientId={user.id}
                    doctorId={apt.doctor_id}
                    appointmentId={apt.id}
                    doctorName={apt.doctor?.full_name || "Doctor"}
                  />
                )}
                {/* Review form for completed, un-reviewed appointments */}
                {apt.status === "completed" && !reviewedIds.has(apt.id) && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <ReviewForm
                      user={user}
                      appointmentId={apt.id}
                      doctorId={apt.doctor_id}
                      onSubmitted={fetchAppointments}
                    />
                  </div>
                )}
                {apt.status === "completed" && reviewedIds.has(apt.id) && (
                  <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" /> Reviewed
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentList;
