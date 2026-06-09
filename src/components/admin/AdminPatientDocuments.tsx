import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Download, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const TYPE_LABEL: Record<string, string> = {
  id_document: "ID Document",
  passport: "Passport",
  id_copy: "ID Copy (legacy)",
};

type Filter = "pending" | "verified" | "rejected";

const AdminPatientDocuments = () => {
  const [filter, setFilter] = useState<Filter>("pending");
  const [docs, setDocs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchDocs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_documents")
      .select("*")
      .in("document_type", ["id_document", "passport", "id_copy"])
      .eq("verification_status", filter)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ variant: "destructive", title: "Failed to load", description: error.message });
      setDocs([]);
    } else {
      setDocs(data || []);
      const ids = Array.from(new Set((data || []).map((d: any) => d.patient_id)));
      if (ids.length) {
        const { data: pr } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        const map: Record<string, any> = {};
        (pr || []).forEach((p: any) => { map[p.id] = p; });
        setProfiles(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [filter]);

  const view = async (doc: any) => {
    const { data, error } = await supabase.storage.from("patient-documents").createSignedUrl(doc.file_path, 120);
    if (error || !data?.signedUrl) {
      toast({ variant: "destructive", title: "Error", description: "Could not generate URL" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const approve = async (doc: any) => {
    const { error } = await supabase.rpc("admin_approve_patient_document", { _doc_id: doc.id });
    if (error) toast({ variant: "destructive", title: "Approve failed", description: error.message });
    else { toast({ title: "Approved" }); fetchDocs(); }
  };

  const reject = async (doc: any) => {
    const reason = (reasonMap[doc.id] || "").trim();
    if (!reason) { toast({ variant: "destructive", title: "Reason required" }); return; }
    const { error } = await supabase.rpc("admin_reject_patient_document", { _doc_id: doc.id, _reason: reason });
    if (error) toast({ variant: "destructive", title: "Reject failed", description: error.message });
    else { toast({ title: "Rejected" }); fetchDocs(); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <ShieldCheck className="h-5 w-5 text-primary" /> Patient ID Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="verified">Verified</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : docs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No {filter} documents.</p>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <div key={doc.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {profiles[doc.patient_id]?.full_name || doc.patient_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABEL[doc.document_type] || doc.document_type} ·{" "}
                      {format(new Date(doc.created_at), "MMM d, yyyy HH:mm")}
                      {doc.expiry_date ? ` · expires ${format(new Date(doc.expiry_date), "MMM d, yyyy")}` : ""}
                    </p>
                    {doc.rejection_reason && (
                      <p className="text-xs text-destructive">Reason: {doc.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => view(doc)}>
                      <Download className="h-3.5 w-3.5" /> View
                    </Button>
                    {filter === "pending" && (
                      <>
                        <Button size="sm" className="gap-1" onClick={() => approve(doc)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => reject(doc)}>
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {filter === "pending" && (
                  <Input
                    placeholder="Rejection reason (required to reject)"
                    value={reasonMap[doc.id] || ""}
                    onChange={(e) => setReasonMap((m) => ({ ...m, [doc.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPatientDocuments;
