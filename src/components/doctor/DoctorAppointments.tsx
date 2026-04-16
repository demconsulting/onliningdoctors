import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, Loader2, FileText, Video, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { User as SupaUser } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PatientDocuments from "@/components/doctor/PatientDocuments";
import PastConsultationNotes from "@/components/doctor/PastConsultationNotes";
import ConsultationOutcomeForm from "@/components/doctor/ConsultationOutcomeForm";
import PrescriptionForm from "@/components/doctor/PrescriptionForm";
import PrescriptionView from "@/components/doctor/PrescriptionView";

interface DoctorAppointmentsProps {
  user: SupaUser;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-muted text-muted-foreground border-border",
  doctor_no_show: "bg-destructive/10 text-destructive border-destructive/20",
};

const DoctorAppointments = ({ user }: DoctorAppointmentsProps) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [sharingMap, setSharingMap] = useState<Record<string, boolean>>({});
  const [declineDialogId, setDeclineDialogId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [noShowDialogId, setNoShowDialogId] = useState<string | null>(null);
  const [markingNoShow, setMarkingNoShow] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchAppointments = async () => {
    const [aptRes, sharingRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("*, patient:patient_id(full_name, avatar_url, phone)")
        .eq("doctor_id", user.id)
        .order("scheduled_at", { ascending: false }),
      supabase
        .from("document_sharing")
        .select("appointment_id, is_active")
        .eq("doctor_id", user.id)
        .eq("is_active", true),
    ]);

    if (aptRes.data) {
      setAppointments(aptRes.data);
      const notes: Record<string, string> = {};
      aptRes.data.forEach(a => { notes[a.id] = a.notes || ""; });
      setNotesMap(notes);
    }
    if (aptRes.error) console.error(aptRes.error);

    if (sharingRes.data) {
      const map: Record<string, boolean> = {};
      sharingRes.data.forEach((s: any) => { map[s.appointment_id] = true; });
      setSharingMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, [user.id]);

  const updateStatus = async (id: string, status: string, cancellation_reason?: string) => {
    const updateData: any = { status };
    if (cancellation_reason) updateData.cancellation_reason = cancellation_reason;
    const { error } = await supabase.from("appointments").update(updateData).eq("id", id).eq("doctor_id", user.id);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else { toast({ title: `Appointment ${status}` }); fetchAppointments(); }
  };

  const handleDecline = async () => {
    if (!declineDialogId) return;
    setDeclining(true);
    await updateStatus(declineDialogId, "cancelled", declineReason.trim() || "Declined by doctor");
    setDeclining(false);
    setDeclineDialogId(null);
    setDeclineReason("");
  };

  const saveNote = async (id: string) => {
    setSavingNote(id);
    const { error } = await supabase.from("appointments").update({ notes: notesMap[id] }).eq("id", id).eq("doctor_id", user.id);
    setSavingNote(null);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else toast({ title: "Note saved" });
  };

  // Only show confirmed, completed, or cancelled appointments to doctors (exclude awaiting_payment and pending)
  const confirmedAppointments = appointments.filter(a => ["confirmed", "completed", "cancelled", "no_show", "doctor_no_show"].includes(a.status));
  const filtered = filter === "all" ? confirmedAppointments : confirmedAppointments.filter(a => a.status === filter);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 font-display">
            <Calendar className="h-5 w-5 text-primary" /> Patient Appointments
          </CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p>No appointments found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((apt) => (
              <div key={apt.id} className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{apt.patient?.full_name || "Patient"}</p>
                      {apt.patient?.phone && <p className="text-xs text-muted-foreground">{apt.patient.phone}</p>}
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
                      {apt.reason && <p className="mt-1 text-xs text-muted-foreground italic">Reason: {apt.reason}</p>}
                      {apt.status === "cancelled" && apt.cancellation_reason && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" /> Cancellation reason: {apt.cancellation_reason}
                        </p>
                      )}
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
                        {!isExpired && apt.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateStatus(apt.id, "confirmed")} className="text-primary">Confirm</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setDeclineDialogId(apt.id); setDeclineReason(""); }} className="text-destructive">Decline</Button>
                          </>
                        )}
                        {!isExpired && apt.status === "confirmed" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/call/${apt.id}`)} className="gap-1 text-primary">
                              <Video className="h-3.5 w-3.5" /> Call
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateStatus(apt.id, "completed")} className="text-success">Complete</Button>
                            <Button size="sm" variant="ghost" onClick={() => setNoShowDialogId(apt.id)} className="text-muted-foreground">No Show</Button>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Patient Documents (if shared) */}
                {sharingMap[apt.id] && (
                  <div className="pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs text-primary"
                      onClick={() => setExpandedDocs(prev => {
                        const next = new Set(prev);
                        next.has(apt.id) ? next.delete(apt.id) : next.add(apt.id);
                        return next;
                      })}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {expandedDocs.has(apt.id) ? "Hide Documents" : "View Patient Documents"}
                    </Button>
                    {expandedDocs.has(apt.id) && (
                      <div className="mt-2">
                        <PatientDocuments patientId={apt.patient_id} patientName={apt.patient?.full_name || "Patient"} />
                      </div>
                    )}
                  </div>
                )}

                {/* Past Consultation Notes (if patient shared documents / gave permission) */}
                {sharingMap[apt.id] && (
                  <PastConsultationNotes
                    patientId={apt.patient_id}
                    currentAppointmentId={apt.id}
                    doctorId={user.id}
                  />
                )}

                {/* Prescription (for confirmed/completed appointments) */}
                {(apt.status === "confirmed" || apt.status === "completed") && (
                  <div className="pt-2 border-t border-border flex items-center gap-2">
                    <PrescriptionForm
                      appointmentId={apt.id}
                      doctorId={user.id}
                      patientId={apt.patient_id}
                      patientName={apt.patient?.full_name || "Patient"}
                    />
                    <PrescriptionView appointmentId={apt.id} viewAs="doctor" />
                  </div>
                )}

                {/* Consultation Outcome (for completed appointments) */}
                {apt.status === "completed" && (
                  <div className="pt-2 border-t border-border">
                    <ConsultationOutcomeForm user={user} appointmentId={apt.id} />
                  </div>
                )}

                {/* Consultation Notes */}
                <div className="space-y-1 pt-2 border-t border-border">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" /> Consultation Notes
                  </div>
                  <Textarea
                    value={notesMap[apt.id] || ""}
                    onChange={(e) => setNotesMap(prev => ({ ...prev, [apt.id]: e.target.value }))}
                    rows={2}
                    placeholder="Add consultation notes..."
                    className="text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => saveNote(apt.id)} disabled={savingNote === apt.id}>
                    {savingNote === apt.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Save Note
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Decline Reason Dialog */}
    <Dialog open={!!declineDialogId} onOpenChange={(open) => { if (!open) { setDeclineDialogId(null); setDeclineReason(""); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline Appointment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Please provide a reason for declining this appointment. The patient will see this reason.</p>
        <Textarea
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
          placeholder="e.g. Schedule conflict, patient needs a different specialist..."
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDeclineDialogId(null); setDeclineReason(""); }}>Cancel</Button>
          <Button variant="destructive" onClick={handleDecline} disabled={declining}>
            {declining ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Decline Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* No Show Confirmation Dialog */}
    <Dialog open={!!noShowDialogId} onOpenChange={(open) => { if (!open) setNoShowDialogId(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as No Show</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Are you sure the patient did not attend this appointment? This will notify the patient and the admin team.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setNoShowDialogId(null)}>Cancel</Button>
          <Button variant="destructive" disabled={markingNoShow} onClick={async () => {
            if (!noShowDialogId) return;
            setMarkingNoShow(true);
            await updateStatus(noShowDialogId, "no_show");
            setMarkingNoShow(false);
            setNoShowDialogId(null);
          }}>
            {markingNoShow ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Confirm No Show
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default DoctorAppointments;
