import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  targetUserId: string;
  targetName: string;
  isTestUser: boolean;
  onDone?: () => void;
}

const TestDeleteDialog = ({ open, onOpenChange, targetUserId, targetName, isTestUser, onDone }: Props) => {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) { setReason(""); setConfirmed(false); setTyped(""); }
  }, [open]);

  const canSubmit = isTestUser && confirmed && typed === "DELETE" && reason.trim().length >= 5 && !submitting;

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await supabase.functions.invoke("admin-user-action", {
        body: {
          action: "permanent_test_delete",
          target_user_id: targetUserId,
          reason: reason.trim(),
          confirmed: true,
          delete_confirmation: typed,
        },
      });
      if (res.error) throw res.error;
      if ((res.data as any)?.error) throw new Error((res.data as any).error);
      toast({ title: "Test user permanently deleted", description: `${targetName} and all related test records were removed.` });
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: e.message || "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Test User Permanently
          </DialogTitle>
          <DialogDescription>{targetName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isTestUser ? (
            <Alert variant="destructive">
              <AlertTitle>Blocked</AlertTitle>
              <AlertDescription>
                Production users with healthcare or payment history must be archived, not permanently deleted.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTitle>Irreversible</AlertTitle>
              <AlertDescription>
                This will permanently delete the profile, appointments, consultations, prescriptions, medical aid
                requests, test payments, notifications, messages, dependents and the auth account.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label>Reason <span className="text-destructive">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="Why is this test user being deleted?" disabled={!isTestUser} />
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(Boolean(v))} disabled={!isTestUser} className="mt-0.5" />
            <span>I confirm this is a test/demo account and understand the deletion is permanent and irreversible.</span>
          </label>

          <div>
            <Label>Type <span className="font-mono">DELETE</span> to confirm</Label>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" disabled={!isTestUser} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button variant="destructive" onClick={submit} disabled={!canSubmit}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
              Delete Permanently
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestDeleteDialog;
