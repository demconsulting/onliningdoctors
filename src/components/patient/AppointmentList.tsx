import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Clock, User, Loader2, Video, Star, Pencil, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { User as SupaUser } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import ReviewForm from "@/components/reviews/ReviewForm";
import DocumentSharingToggle from "@/components/patient/DocumentSharingToggle";
import PrescriptionView from "@/components/doctor/PrescriptionView";

interface AppointmentListProps {
  user: SupaUser;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-muted text-muted-foreground border-border",
  doctor_no_show: "bg-destructive/10 text-destructive border-destructive/20",
  awaiting_payment: "bg-destructive/10 text-destructive border-destructive/20",
};

const AppointmentList = ({ user }: AppointmentListProps) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [reviewsMap, setReviewsMap] = useState<Record<string, any>>({});
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
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

  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [noShowDialogId, setNoShowDialogId] = useState<string | null>(null);
  const [reportingNoShow, setReportingNoShow] = useState(false);

  const handleCancel = async () => {
    if (!cancelDialogId) return;
    setCancelling(true);
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled", cancellation_reason: cancelReason.trim() || "Cancelled by patient" })
      .eq("id", cancelDialogId)
      .eq("patient_id", user.id);

    setCancelling(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Appointment cancelled" });
      setCancelDialogId(null);
      setCancelReason("");
      fetchAppointments();
    }
  };


  // Separate unpaid (awaiting_payment) from normal appointments
  const unpaidAppointments = appointments.filter((apt) => apt.status === "awaiting_payment");
  const paidAppointments = appointments.filter((apt) => apt.status !== "awaiting_payment");

  const filteredAppointments = statusFilter
    ? paidAppointments.filter((apt) => apt.status === statusFilter)
    : paidAppointments;

  const [showArchived, setShowArchived] = useState(false);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Calendar className="h-5 w-5 text-primary" /> My Appointments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filter buttons */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={statusFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(null)}
            className="text-xs"
          >
            All
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending")}
            className="text-xs"
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === "confirmed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("confirmed")}
            className="text-xs"
          >
            Confirmed
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("completed")}
            className="text-xs"
          >
            Completed
          </Button>
          <Button
            variant={statusFilter === "cancelled" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("cancelled")}
            className="text-xs"
          >
            Cancelled
          </Button>
        </div>

        {/* Appointments list */}
        {filteredAppointments.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p>{statusFilter ? `No ${statusFilter} appointments` : "No appointments yet"}</p>
            {!statusFilter && <p className="text-sm">Book your first appointment with a doctor</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((apt) => (
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
                    {apt.status === "cancelled" && apt.cancellation_reason && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" /> {apt.cancellation_reason}
                      </p>
                    )}
                  </div>
                </div>
                {(() => {
                   const aptEnd = new Date(new Date(apt.scheduled_at).getTime() + (apt.duration_minutes || 30) * 60000);
                   const isExpired = Date.now() > aptEnd.getTime() + 30 * 60000;
                   const displayStatus = isExpired && (apt.status === "pending" || apt.status === "confirmed") ? "expired" : apt.status;
                   return (
                     <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                       <div className="flex items-center gap-2">
                         {displayStatus === "awaiting_payment" && (
                           <AlertCircle className="h-4 w-4 text-destructive animate-pulse" />
                         )}
                         <Badge variant="outline" className={displayStatus === "expired" ? "bg-muted text-muted-foreground border-border" : (statusColors[apt.status] || "")}>
                            {displayStatus === "expired" ? "past" : displayStatus === "awaiting_payment" ? "Payment Pending" : apt.status === "doctor_no_show" ? "Doctor No-Show" : apt.status}
                          </Badge>
                       </div>
                       <div className="flex flex-wrap gap-2">
                         {displayStatus === "awaiting_payment" && (
                           <Button variant="default" size="sm" className="gap-1 text-xs" onClick={() => navigate(`/dashboard?activeTab=book`)}>
                             Complete Payment
                           </Button>
                         )}
                          {!isExpired && apt.status === "confirmed" && (
                            <>
                              <Button variant="outline" size="sm" className="gap-1 text-primary" onClick={() => navigate(`/call/${apt.id}`)}>
                                <Video className="h-3.5 w-3.5" /> Join Call
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setCancelDialogId(apt.id); setCancelReason(""); }}>
                                Cancel
                              </Button>
                            </>
                          )}
                          {/* Show "Report Doctor No-Show" after appointment time has passed */}
                          {isExpired && apt.status === "confirmed" && (
                            <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => setNoShowDialogId(apt.id)}>
                              <AlertCircle className="h-3.5 w-3.5 mr-1" /> Report Doctor No-Show
                            </Button>
                          )}
                          {!isExpired && apt.status === "pending" && (
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setCancelDialogId(apt.id); setCancelReason(""); }}>
                              Cancel
                            </Button>
                          )}
                       </div>
                     </div>
                   );
                 })()}
                {/* Prescription view for completed appointments */}
                {apt.status === "completed" && (
                  <div className="mt-2">
                    <PrescriptionView appointmentId={apt.id} viewAs="patient" />
                  </div>
                )}
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
                {apt.status === "completed" && reviewedIds.has(apt.id) && editingReviewId !== apt.id && (() => {
                   const rev = reviewsMap[apt.id];
                   const canEdit = rev && (Date.now() - new Date(rev.created_at).getTime()) < 24 * 3600000;
                   return (
                     <div className="mt-3 pt-3 border-t border-border space-y-2">
                       <div className="flex items-start justify-between gap-2">
                         <div className="flex-1">
                           <div className="flex items-center gap-1 mb-1">
                             {[1, 2, 3, 4, 5].map((s) => (
                               <Star key={s} className={`h-3 w-3 ${rev.rating >= s ? "fill-warning text-warning" : "text-muted-foreground/20"}`} />
                             ))}
                             <span className="text-xs text-muted-foreground ml-1">({rev.rating}/5)</span>
                           </div>
                           {rev.comment && (
                             <p className="text-xs text-foreground line-clamp-2">{rev.comment}</p>
                           )}
                         </div>
                         {canEdit && (
                           <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs text-muted-foreground shrink-0" onClick={() => setEditingReviewId(apt.id)}>
                             <Pencil className="h-3 w-3" /> Edit
                           </Button>
                         )}
                       </div>
                     </div>
                   );
                 })()}
                {apt.status === "completed" && reviewedIds.has(apt.id) && editingReviewId === apt.id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <ReviewForm
                      user={user}
                      appointmentId={apt.id}
                      doctorId={apt.doctor_id}
                      existingReview={reviewsMap[apt.id]}
                      onSubmitted={() => { setEditingReviewId(null); fetchAppointments(); }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Archived / Unpaid Appointments */}
        {unpaidAppointments.length > 0 && (
          <div className="mt-6 border-t border-border pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="mb-3 gap-1.5 text-muted-foreground"
              onClick={() => setShowArchived(!showArchived)}
            >
              <AlertCircle className="h-4 w-4" />
              Archived — Unpaid ({unpaidAppointments.length})
              <span className="text-xs">{showArchived ? "▲" : "▼"}</span>
            </Button>
            {showArchived && (
              <div className="space-y-3">
                {unpaidAppointments.map((apt) => (
                  <div key={apt.id} className="flex flex-col gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between opacity-75">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                        <User className="h-5 w-5 text-destructive" />
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
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive animate-pulse" />
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        Payment Pending
                      </Badge>
                      <Button variant="default" size="sm" className="gap-1 text-xs" onClick={() => navigate(`/dashboard?activeTab=book`)}>
                        Complete Payment
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setCancelDialogId(apt.id); setCancelReason(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={!!cancelDialogId} onOpenChange={(open) => { if (!open) { setCancelDialogId(null); setCancelReason(""); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Appointment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Please provide a reason for cancelling this appointment.</p>
        <Textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="e.g. Schedule conflict, feeling better..."
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCancelDialogId(null); setCancelReason(""); }}>Go Back</Button>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Cancel Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Doctor No-Show Confirmation Dialog */}
    <Dialog open={!!noShowDialogId} onOpenChange={(open) => { if (!open) setNoShowDialogId(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Doctor No-Show</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure the doctor did not attend this appointment? This will be reported to the admin team for review and the doctor will be notified.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setNoShowDialogId(null)}>Go Back</Button>
          <Button variant="destructive" disabled={reportingNoShow} onClick={async () => {
            if (!noShowDialogId) return;
            setReportingNoShow(true);
            const { error } = await supabase
              .from("appointments")
              .update({ status: "doctor_no_show" })
              .eq("id", noShowDialogId)
              .eq("patient_id", user.id);
            setReportingNoShow(false);
            if (error) {
              toast({ variant: "destructive", title: "Error", description: error.message });
            } else {
              toast({ title: "Doctor no-show reported", description: "The admin team has been notified." });
              setNoShowDialogId(null);
              fetchAppointments();
            }
          }}>
            {reportingNoShow ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Report No-Show
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AppointmentList;
