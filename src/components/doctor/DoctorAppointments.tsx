import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, Loader2, FileText, Video } from "lucide-react";
import { format } from "date-fns";
import type { User as SupaUser } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import PatientDocuments from "@/components/doctor/PatientDocuments";

interface DoctorAppointmentsProps {
  user: SupaUser;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-muted text-muted-foreground border-border",
};

const DoctorAppointments = ({ user }: DoctorAppointmentsProps) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [sharingMap, setSharingMap] = useState<Record<string, boolean>>({});
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

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id).eq("doctor_id", user.id);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else { toast({ title: `Appointment ${status}` }); fetchAppointments(); }
  };

  const saveNote = async (id: string) => {
    setSavingNote(id);
    const { error } = await supabase.from("appointments").update({ notes: notesMap[id] }).eq("id", id).eq("doctor_id", user.id);
    setSavingNote(null);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else toast({ title: "Note saved" });
  };

  const filtered = filter === "all" ? appointments : appointments.filter(a => a.status === filter);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusColors[apt.status] || ""}>{apt.status}</Badge>
                    {apt.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(apt.id, "confirmed")} className="text-primary">Confirm</Button>
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(apt.id, "cancelled")} className="text-destructive">Decline</Button>
                      </>
                    )}
                    {apt.status === "confirmed" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/call/${apt.id}`)} className="gap-1 text-primary">
                          <Video className="h-3.5 w-3.5" /> Call
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(apt.id, "completed")} className="text-success">Complete</Button>
                      </>
                    )}
                  </div>
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
  );
};

export default DoctorAppointments;
