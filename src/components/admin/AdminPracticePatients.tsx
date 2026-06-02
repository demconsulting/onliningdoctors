import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Unlink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Row {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  doctor_id: string | null;
  practice_id: string | null;
  linked_user_id: string | null;
  consent_status: string;
  created_at: string;
}

const AdminPracticePatients = () => {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("practice_patients")
      .select("id, full_name, phone, email, doctor_id, practice_id, linked_user_id, consent_status, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    setItems((data as Row[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const unlink = async (id: string) => {
    if (!reason.trim()) { toast({ variant: "destructive", title: "Reason required" }); return; }
    const { error } = await supabase.rpc("admin_unlink_practice_patient", { _practice_patient_id: id, _reason: reason });
    if (error) { toast({ variant: "destructive", title: "Error", description: error.message }); return; }
    toast({ title: "Unlinked" });
    setReasonFor(null); setReason(""); load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Practice Patients</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">No records yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">{[p.phone, p.email].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.consent_status === "granted" ? "default" : p.consent_status === "denied" ? "destructive" : "secondary"}>
                      {p.consent_status}
                    </Badge>
                    {p.linked_user_id && (
                      <Button size="sm" variant="outline" onClick={() => setReasonFor(p.id === reasonFor ? null : p.id)} className="gap-1">
                        <Unlink className="h-4 w-4" /> Unlink
                      </Button>
                    )}
                  </div>
                </div>
                {reasonFor === p.id && (
                  <div className="mt-2 flex gap-2">
                    <Input placeholder="Reason for unlinking (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <Button size="sm" onClick={() => unlink(p.id)}>Confirm</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPracticePatients;
