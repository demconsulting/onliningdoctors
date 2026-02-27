import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { FileText, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentSharingToggleProps {
  patientId: string;
  doctorId: string;
  appointmentId: string;
  doctorName: string;
}

const DocumentSharingToggle = ({ patientId, doctorId, appointmentId, doctorName }: DocumentSharingToggleProps) => {
  const [shared, setShared] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("document_sharing")
        .select("id, is_active")
        .eq("patient_id", patientId)
        .eq("doctor_id", doctorId)
        .eq("appointment_id", appointmentId)
        .maybeSingle();
      if (data) setShared(data.is_active);
      setLoading(false);
    };
    check();
  }, [patientId, doctorId, appointmentId]);

  const toggle = async (checked: boolean) => {
    setShared(checked);
    if (checked) {
      const { error } = await supabase.from("document_sharing").upsert(
        { patient_id: patientId, doctor_id: doctorId, appointment_id: appointmentId, is_active: true },
        { onConflict: "patient_id,doctor_id,appointment_id" }
      );
      if (error) {
        setShared(false);
        toast({ variant: "destructive", title: "Error", description: error.message });
        return;
      }
      toast({ title: "Documents shared", description: `Dr. ${doctorName} can now view your documents.` });
    } else {
      const { error } = await supabase
        .from("document_sharing")
        .update({ is_active: false })
        .eq("patient_id", patientId)
        .eq("doctor_id", doctorId)
        .eq("appointment_id", appointmentId);
      if (error) {
        setShared(true);
        toast({ variant: "destructive", title: "Error", description: error.message });
        return;
      }
      toast({ title: "Sharing revoked", description: `Dr. ${doctorName} can no longer view your documents.` });
    }
  };

  if (loading) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
      <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="text-muted-foreground">Share documents with Dr. {doctorName}</span>
      <Switch checked={shared} onCheckedChange={toggle} className="ml-auto scale-90" />
    </div>
  );
};

export default DocumentSharingToggle;
