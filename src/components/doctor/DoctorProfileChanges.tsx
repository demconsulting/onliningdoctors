import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ClipboardList } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Props { user: User }

type Change = {
  id: string;
  field_name: string;
  old_value: any;
  new_value: any;
  status: "pending" | "approved" | "rejected" | "needs_info";
  rejection_reason: string | null;
  info_request_message: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const fmt = (v: any) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v || "—";
  try { return JSON.stringify(v); } catch { return String(v); }
};

const statusVariant = (s: string) =>
  s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";

const DoctorProfileChanges = ({ user }: Props) => {
  const [loading, setLoading] = useState(true);
  const [changes, setChanges] = useState<Change[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("doctor_profile_changes" as any)
        .select("*")
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false });
      setChanges((data as any) || []);
      setLoading(false);
    };
    load();
  }, [user.id]);

  const filter = (s: string) => changes.filter(c => c.status === s);

  const List = ({ items }: { items: Change[] }) => {
    if (items.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No changes here.</p>;
    return (
      <div className="space-y-3">
        {items.map(c => (
          <div key={c.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{c.field_name.replace(/_/g, " ")}</span>
                  <Badge variant={statusVariant(c.status) as any}>{c.status}</Badge>
                </div>
                <div className="grid gap-1 text-sm sm:grid-cols-2">
                  <div><span className="text-muted-foreground">Old:</span> {fmt(c.old_value)}</div>
                  <div><span className="text-muted-foreground">New:</span> {fmt(c.new_value)}</div>
                </div>
                {c.rejection_reason && (
                  <p className="text-sm text-destructive">Reason: {c.rejection_reason}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(c.created_at).toLocaleString()}
                  {c.reviewed_at && ` · Reviewed ${new Date(c.reviewed_at).toLocaleString()}`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <ClipboardList className="h-5 w-5 text-primary" /> Profile Change Requests
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Regulated fields (name, HPCSA, specialty, qualifications, verification documents) require admin review.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending ({filter("pending").length})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({filter("approved").length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({filter("rejected").length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-4"><List items={filter("pending")} /></TabsContent>
            <TabsContent value="approved" className="mt-4"><List items={filter("approved")} /></TabsContent>
            <TabsContent value="rejected" className="mt-4"><List items={filter("rejected")} /></TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default DoctorProfileChanges;
