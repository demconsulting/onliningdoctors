import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, Tag, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const DOCUMENT_TYPES: Record<string, string> = {
  id_copy: "ID Copy",
  medical_record: "Medical Record",
  prescription: "Prescription",
  test_result: "Test Result",
  other: "Other",
};

interface PatientDocumentsProps {
  patientId: string;
  patientName: string;
}

const PatientDocuments = ({ patientId, patientName }: PatientDocumentsProps) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("patient_documents")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (data) setDocuments(data);
      if (error) console.error(error);
      setLoading(false);
    };
    fetch();
  }, [patientId]);

  const handleDownload = async (doc: any) => {
    const { data, error } = await supabase.storage
      .from("patient-documents")
      .createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({ variant: "destructive", title: "Error", description: "Could not generate download link" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  if (documents.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">
        <FileText className="mx-auto mb-1 h-6 w-6 text-muted-foreground/40" />
        No documents shared
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span>{patientName}'s shared documents</span>
      </div>
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between rounded-md border border-border bg-background p-2.5">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-medium text-foreground">{doc.file_name}</p>
                {doc.document_type && doc.document_type !== "other" && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    <Tag className="h-2.5 w-2.5" />
                    {DOCUMENT_TYPES[doc.document_type] || doc.document_type}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {formatSize(doc.file_size || 0)} · {format(new Date(doc.created_at), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default PatientDocuments;
