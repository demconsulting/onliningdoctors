import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const AdminContacts = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = async () => {
    const { data } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSubmissions(data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const markRead = async (id: string) => {
    await supabase.from("contact_submissions").update({ is_read: true }).eq("id", id);
    fetch();
  };

  const deleteSubmission = async (id: string) => {
    await supabase.from("contact_submissions").delete().eq("id", id);
    toast({ title: "Message deleted" });
    fetch();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Mail className="h-5 w-5 text-primary" /> Contact Messages ({submissions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {submissions.length === 0 && <p className="text-sm text-muted-foreground">No contact messages yet.</p>}
        {submissions.map((s) => (
          <div key={s.id} className={`rounded-lg border p-4 space-y-2 ${!s.is_read ? "border-primary/30 bg-primary/5" : "border-border"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <span className="text-xs text-muted-foreground">{s.email}</span>
                {!s.is_read && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">New</Badge>}
              </div>
              <div className="flex gap-1">
                {!s.is_read && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markRead(s.id)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSubmission(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {s.subject && <p className="text-sm font-medium text-foreground">{s.subject}</p>}
            <p className="text-sm text-muted-foreground">{s.message}</p>
            <p className="text-[10px] text-muted-foreground">{format(new Date(s.created_at), "MMM d, yyyy h:mm a")}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AdminContacts;
