import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface PastConsultationNotesProps {
  patientId: string;
  currentAppointmentId: string;
  doctorId: string;
}

const PastConsultationNotes = ({ patientId, currentAppointmentId, doctorId }: PastConsultationNotesProps) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchNotes = async () => {
      // Get all past appointments for this patient with this doctor (excluding current)
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status")
        .eq("doctor_id", doctorId)
        .eq("patient_id", patientId)
        .neq("id", currentAppointmentId)
        .in("status", ["completed", "confirmed"])
        .order("scheduled_at", { ascending: false });

      if (!appointments || appointments.length === 0) {
        setLoading(false);
        return;
      }

      const aptIds = appointments.map(a => a.id);
      const { data: consultationNotes } = await supabase
        .from("consultation_notes")
        .select("appointment_id, content, updated_at")
        .in("appointment_id", aptIds);

      if (consultationNotes && consultationNotes.length > 0) {
        const merged = consultationNotes
          .map(note => {
            const apt = appointments.find(a => a.id === note.appointment_id);
            return { ...note, scheduled_at: apt?.scheduled_at };
          })
          .filter(n => n.content?.trim())
          .sort((a, b) => new Date(b.scheduled_at || 0).getTime() - new Date(a.scheduled_at || 0).getTime());
        setNotes(merged);
      }
      setLoading(false);
    };
    fetchNotes();
  }, [patientId, currentAppointmentId, doctorId]);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (notes.length === 0) return null;

  return (
    <div className="pt-2 border-t border-border">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs text-primary"
        onClick={() => setExpanded(!expanded)}
      >
        <FileText className="h-3.5 w-3.5" />
        Past Consultation Notes ({notes.length})
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>
      {expanded && (
        <ScrollArea className="mt-2 max-h-60">
          <div className="space-y-3 pr-3">
            {notes.map((note, i) => (
              <div key={i} className="rounded-md border border-border bg-background p-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {note.scheduled_at ? format(new Date(note.scheduled_at), "MMM d, yyyy") : "Unknown date"}
                </p>
                <p className="whitespace-pre-wrap text-foreground">{note.content}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default PastConsultationNotes;
