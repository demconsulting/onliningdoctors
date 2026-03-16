import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, FileText, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConsultationNotesProps {
  appointmentId: string;
  doctorId: string;
  isDoctor: boolean;
}

const ConsultationNotes = ({ appointmentId, doctorId, isDoctor }: ConsultationNotesProps) => {
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const { toast } = useToast();

  // Load existing notes
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("consultation_notes")
        .select("content, updated_at, summary")
        .eq("appointment_id", appointmentId)
        .maybeSingle();

      if (data) {
        setContent(data.content);
        setSummary((data as any).summary || "");
        setLastSaved(new Date(data.updated_at));
        if ((data as any).summary) setShowSummary(true);
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

  const generateSummary = useCallback(async () => {
    if (!content || content.trim().length < 10) {
      toast({ variant: "destructive", title: "Notes too short", description: "Write more detailed notes before generating a summary." });
      return;
    }

    // Save notes first
    await saveNotes();

    setSummarizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-consultation", {
        body: { appointment_id: appointmentId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSummary(data.summary);
      setShowSummary(true);
      toast({ title: "AI summary generated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Summary failed", description: err.message || "Could not generate summary" });
    } finally {
      setSummarizing(false);
    }
  }, [content, appointmentId, saveNotes, toast]);

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
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={generateSummary}
              disabled={summarizing || !content}
              className="gap-1 text-xs"
            >
              {summarizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              AI Summary
            </Button>
            <Button size="sm" onClick={saveNotes} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 pt-0">
        {/* AI Summary section */}
        {summary && (
          <div className="rounded-lg border border-primary/20 bg-primary/5">
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-primary"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                AI-Generated Summary
              </span>
              {showSummary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showSummary && (
              <div className="border-t border-primary/10 px-3 py-2">
                <p className="whitespace-pre-wrap text-xs text-foreground/80 leading-relaxed">{summary}</p>
              </div>
            )}
          </div>
        )}

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
