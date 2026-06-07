import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import ExportMenu from "./ExportMenu";

export default function FirstConsultationTracker() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_first_consultation_pending" as any);
      setRows((data as any[]) || []);
      setLoading(false);
    })();
  }, []);

  const sendFollowUp = async (r: any) => {
    if (!r.email) { toast({ title: "No email on file", variant: "destructive" }); return; }
    const { error } = await supabase.functions.invoke("send-recruitment-email", {
      body: {
        recipients: [{ email: r.email, name: r.full_name }],
        subject: "Ready to see your first patient?",
        html: `<p>Hi ${r.full_name},</p><p>You're verified on Doctors Onlining! Set your availability to start receiving consultation requests.</p>`,
        templateKey: "first_consult_followup",
      },
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Follow-up sent" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportMenu
          filename="first-consultation-pending"
          columns={[
            { key: "full_name", label: "Doctor" },
            { key: "email", label: "Email" },
            { key: "days_since_verified", label: "Days Since Verified" },
            { key: "has_availability", label: "Availability" },
            { key: "profile_completion_pct", label: "Profile %" },
          ]}
          rows={rows}
        />
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Doctor</TableHead>
              <TableHead>Days Since Verified</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Profile Completion</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.profile_id}>
                <TableCell>
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </TableCell>
                <TableCell>{r.days_since_verified}</TableCell>
                <TableCell>
                  {r.has_availability ? <Badge variant="outline" className="border-emerald-500 text-emerald-600">Set</Badge> : <Badge variant="destructive">Missing</Badge>}
                </TableCell>
                <TableCell className="min-w-[160px]">
                  <div className="flex items-center gap-2">
                    <Progress value={r.profile_completion_pct} className="h-2" />
                    <span className="text-xs">{r.profile_completion_pct}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => sendFollowUp(r)}><Send className="h-3 w-3 mr-1" /> Follow-Up</Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">All verified doctors have completed at least one consultation.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
