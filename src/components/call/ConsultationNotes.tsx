import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConsultationNotesProps {
  appointmentId: string;
  doctorId: string;
  isDoctor: boolean;
}

const ConsultationNotes = ({ appointmentId, doctorId, isDoctor }: ConsultationNotesProps) => {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();

  // Load existing notes
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("consultation_notes")
        .select("content, updated_at")
        .eq("appointment_id", appointmentId)
        .maybeSingle();

      if (data) {
        setContent(data.content);
        setLastSaved(new Date(data.updated_at));
      }
      setLoading(false);
    };
    load();
  }, [appointmentId]);

  const saveNotes = useCallback(async () => {
    setSaving(true);
    const { error } = await supabase
      .from("consultation_notes")
      .upsert(
        { appointment_id: appointmentId, doctor_id: doctorId, content },
        { onConflict: "appointment_id" }
      );

    if (error) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
    } else {
      setLastSaved(new Date());
      toast({ title: "Notes saved" });
    }
    setSaving(false);
  }, [appointmentId, doctorId, content, toast]);

  // Auto-save every 30 seconds for doctors
  useEffect(() => {
    if (!isDoctor || !content) return;
    const timer = setInterval(() => {
      saveNotes();
    }, 30000);
    return () => clearInterval(timer);
  }, [isDoctor, content, saveNotes]);

  if (loading) {
    return (
      <Card className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Consultation Notes
        </CardTitle>
        {isDoctor && (
          <Button size="sm" onClick={saveNotes} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 pt-0">
        {isDoctor ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your consultation notes here... (auto-saves every 30s)"
            className="flex-1 resize-none text-sm min-h-[300px]"
          />
        ) : (
          <ScrollArea className="flex-1 rounded-md border p-3 min-h-[300px]">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {content || "No notes yet."}
            </p>
          </ScrollArea>
        )}
        {lastSaved && (
          <p className="text-xs text-muted-foreground">
            Last saved: {lastSaved.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ConsultationNotes;
