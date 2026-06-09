import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Trash2, Loader2, Download, Tag, AlertTriangle, CheckCircle2, Clock, XCircle, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { User } from "@supabase/supabase-js";
import { uploadFile, type UploadProfileKey, UPLOAD_PROFILES } from "@/lib/fileUpload";
import FilePreview from "@/components/shared/FilePreview";

interface DocumentUploadProps {
  user: User;
}

// Ordered as required. `id_document` is default.
const DOCUMENT_TYPES: Array<{ value: string; label: string; profile: UploadProfileKey }> = [
  { value: "id_document", label: "ID Document", profile: "doctor_id" },
  { value: "passport", label: "Passport", profile: "doctor_id" },
  { value: "medical_aid_card", label: "Medical Aid Card", profile: "patient_doc" },
  { value: "prescription", label: "Prescription", profile: "prescription" },
  { value: "medical_report", label: "Medical Report", profile: "medical_report" },
  { value: "blood_results", label: "Blood Results", profile: "medical_report" },
  { value: "xray_scan", label: "X-Ray / Scan", profile: "medical_report" },
  { value: "referral_letter", label: "Referral Letter", profile: "patient_doc" },
  { value: "vaccination_record", label: "Vaccination Record", profile: "patient_doc" },
  // Legacy / fallback labels kept so existing rows continue to render nicely
  { value: "medical_record", label: "Medical Record", profile: "medical_report" },
  { value: "test_result", label: "Test Result", profile: "medical_report" },
  { value: "id_copy", label: "ID Copy", profile: "doctor_id" },
  { value: "other", label: "Other", profile: "patient_doc" },
];

const ID_TYPES = new Set(["id_document", "passport", "id_copy"]);
const labelFor = (v: string) => DOCUMENT_TYPES.find((t) => t.value === v)?.label || v;

const StatusBadge = ({ status, reason }: { status?: string; reason?: string | null }) => {
  const map: Record<string, { icon: any; cls: string; label: string }> = {
    verified: { icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", label: "Verified" },
    pending: { icon: Clock, cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400", label: "Pending" },
    rejected: { icon: XCircle, cls: "bg-destructive/10 text-destructive", label: "Rejected" },
  };
  const cfg = map[status || "pending"] || map.pending;
  const Icon = cfg.icon;
  return (
    <span
      title={reason || undefined}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
};

const DocumentUpload = ({ user }: DocumentUploadProps) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("id_document");
  const [expiryDate, setExpiryDate] = useState("");
  const [pending, setPending] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const selectedConfig = DOCUMENT_TYPES.find((t) => t.value === selectedType) ?? DOCUMENT_TYPES[0];
  const profileCfg = UPLOAD_PROFILES[selectedConfig.profile];
  const isPassport = selectedType === "passport";

  const fetchDocs = async () => {
    const { data } = await supabase
      .from("patient_documents")
      .select("*")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setDocuments(data);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [user.id]);

  // Identity status (latest ID / passport row)
  const idDocs = documents.filter((d) => ID_TYPES.has(d.document_type));
  const latestId = idDocs[0];
  const idStatus: "not_uploaded" | "pending" | "verified" | "rejected" =
    !latestId ? "not_uploaded" : ((latestId as any).verification_status || "pending");

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPending(file);
  };

  const handleConfirmUpload = async () => {
    if (!pending) return;
    if (isPassport && !expiryDate) {
      toast({ variant: "destructive", title: "Expiry date required", description: "Please provide the passport expiry date." });
      return;
    }
    setUploading(true);
    try {
      const safeName = pending.name.replace(/[^\w.\-]/g, "_");
      const { path, size, mimeType, fileName } = await uploadFile({
        bucket: "patient-documents",
        path: `${user.id}/${Date.now()}_${safeName}`,
        file: pending,
        profile: selectedConfig.profile,
        onOptimizing: () => toast({ title: "Optimising image before upload..." }),
      });

      const { error: dbError } = await supabase.from("patient_documents").insert({
        patient_id: user.id,
        file_name: fileName,
        file_path: path,
        mime_type: mimeType,
        file_size: size,
        document_type: selectedType,
        expiry_date: isPassport && expiryDate ? expiryDate : null,
      } as any);

      if (dbError) {
        toast({ variant: "destructive", title: "Error saving record", description: dbError.message });
      } else {
        toast({
          title: "Document uploaded",
          description: ID_TYPES.has(selectedType) ? "Your ID is pending admin verification." : undefined,
        });
        setPending(null);
        setExpiryDate("");
        fetchDocs();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

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

  const handleDelete = async (doc: any) => {
    await supabase.storage.from("patient-documents").remove([doc.file_path]);
    const { error } = await supabase.from("patient_documents").delete().eq("id", doc.id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Document deleted" });
      fetchDocs();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const acceptAttr = profileCfg.extensions.map((e) => "." + e).join(",");

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // Visible selector list — omit legacy values from the dropdown
  const selectableTypes = DOCUMENT_TYPES.filter(
    (t) => !["medical_record", "test_result", "id_copy"].includes(t.value),
  );

  return (
    <div className="space-y-4">
      {(idStatus === "not_uploaded" || idStatus === "rejected") && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>ID Verification Required</AlertTitle>
          <AlertDescription>
            {idStatus === "rejected"
              ? `Your ID was rejected${latestId?.rejection_reason ? `: ${latestId.rejection_reason}` : ""}. Please upload a valid South African ID or Passport.`
              : "Please upload a valid South African ID or Passport to verify your account."}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 font-display">
            <FileText className="h-5 w-5 text-primary" /> Documents
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={selectedType}
              onValueChange={(v) => { setSelectedType(v); setPending(null); setExpiryDate(""); }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {selectableTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              ref={fileRef}
              type="file"
              className="hidden"
              accept={acceptAttr}
              onChange={handleFilePick}
            />
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4" /> Choose
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Allowed: {profileCfg.extensions.join(", ").toUpperCase()} · Max {(profileCfg.maxBytes / 1024 / 1024).toFixed(0)}MB
          </p>

          {isPassport && (
            <div className="mb-3 max-w-xs">
              <Label htmlFor="passport-expiry" className="text-xs">Passport expiry date</Label>
              <Input
                id="passport-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          )}

          {pending && (
            <div className="mb-4 space-y-2">
              <FilePreview file={pending} onClear={() => setPending(null)} />
              <Button size="sm" className="gap-2" onClick={handleConfirmUpload} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload Document
              </Button>
            </div>
          )}

          {documents.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p>No documents uploaded</p>
              <p className="text-sm">Start by uploading your ID document or passport to verify your account.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="truncate text-sm font-medium text-foreground">{doc.file_name}</p>
                        {doc.document_type && doc.document_type !== "other" && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <Tag className="h-3 w-3" />
                            {labelFor(doc.document_type)}
                          </span>
                        )}
                        {ID_TYPES.has(doc.document_type) && (
                          <StatusBadge status={(doc as any).verification_status} reason={(doc as any).rejection_reason} />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(doc.file_size || 0)} · {format(new Date(doc.created_at), "MMM d, yyyy")}
                        {(doc as any).expiry_date ? ` · expires ${format(new Date((doc as any).expiry_date), "MMM d, yyyy")}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(doc)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentUpload;
