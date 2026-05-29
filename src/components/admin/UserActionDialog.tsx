import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type UserAction = "suspend" | "deactivate" | "archive" | "delete";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  action: UserAction;
  targetUserId: string;
  targetName: string;
  onDone?: () => void;
}

const META: Record<UserAction, { title: string; verb: string; tone: "warning" | "destructive"; description: string }> = {
  suspend: {
    title: "Suspend User",
    verb: "Suspend",
    tone: "warning",
    description: "User is temporarily blocked from using the platform. All historical data is preserved and login can be restored.",
  },
  deactivate: {
    title: "Deactivate User",
    verb: "Deactivate",
    tone: "warning",
    description: "Removes login access and hides the user from active lists. All medical, appointment, consultation and audit history is preserved.",
  },
  archive: {
    title: "Archive User (recommended)",
    verb: "Archive",
    tone: "warning",
    description: "Soft-deletes the account while preserving every healthcare record. This is the safe, healthcare-compliant choice.",
  },
  delete: {
    title: "Permanently Delete User",
    verb: "Permanently delete",
    tone: "destructive",
    description: "Irreversible. Only allowed if the user has no medical, appointment, prescription, payment or audit records.",
  },
};

const UserActionDialog = ({ open, onOpenChange, action, targetUserId, targetName, onDone }: Props) => {
  const meta = META[action];
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dependencies, setDependencies] = useState<Record<string, number> | null>(null);
  const [blocked, setBlocked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setReason(""); setNotes(""); setConfirmed(false); setDependencies(null); setBlocked(false);
      return;
    }
    if (action === "delete") {
      (async () => {
        const res = await supabase.functions.invoke("admin-user-action", {
          body: { action: "view", target_user_id: targetUserId },
        });
        const deps = (res.data?.dependencies || {}) as Record<string, number>;
        setDependencies(deps);
        const total = Object.values(deps).reduce((a, v) => a + Number(v || 0), 0);
        setBlocked(total > 0);
      })();
    }
  }, [open, action, targetUserId]);

  const submit = async () => {
    if (reason.trim().length < 5) {
      toast({ variant: "destructive", title: "A reason is required (min 5 chars)" });
      return;
    }
    if (!confirmed) {
      toast({ variant: "destructive", title: "Please confirm you understand the impact" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await supabase.functions.invoke("admin-user-action", {
        body: { action, target_user_id: targetUserId, reason: reason.trim(), notes: notes.trim() || null, confirmed: true },
      });
      if (res.error) throw res.error;
      if ((res.data as any)?.error) throw new Error((res.data as any).error);
      toast({ title: `${meta.verb} successful`, description: `${targetName} has been ${meta.verb.toLowerCase()}d.` });
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast({ variant: "destructive", title: `${meta.verb} failed`, description: e.message || "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className={meta.tone === "destructive" ? "h-5 w-5 text-destructive" : "h-5 w-5 text-amber-500"} />
            {meta.title}
          </DialogTitle>
          <DialogDescription>{targetName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant={meta.tone === "destructive" ? "destructive" : "default"}>
            <AlertTitle>{meta.tone === "destructive" ? "Irreversible action" : "This action is logged"}</AlertTitle>
            <AlertDescription>{meta.description}</AlertDescription>
          </Alert>

          {action === "delete" && dependencies && (
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium mb-1">Linked records</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
                {Object.entries(dependencies).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className="capitalize">{k.replaceAll("_", " ")}</span>
                    <span className={Number(v) > 0 ? "text-destructive font-semibold" : ""}>{v}</span>
                  </li>
                ))}
              </ul>
              {blocked && (
                <p className="mt-3 text-destructive text-sm">
                  This user has linked healthcare or transaction records and cannot be permanently deleted. Archive instead.
                </p>
              )}
            </div>
          )}

          <div>
            <Label>Reason <span className="text-destructive">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="Why is this action being taken?" />
          </div>
          <div>
            <Label>Internal admin notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Optional notes for the audit trail" />
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(Boolean(v))} className="mt-0.5" />
            <span>I confirm I understand this action may affect access to healthcare records.</span>
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button
              variant={meta.tone === "destructive" ? "destructive" : "default"}
              onClick={submit}
              disabled={submitting || !confirmed || reason.trim().length < 5 || (action === "delete" && blocked)}
            >
              {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {meta.verb}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserActionDialog;
