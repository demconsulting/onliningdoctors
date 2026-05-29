import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, UserCog } from "lucide-react";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetName: string;
}

const ImpersonateDialog = ({ open, onOpenChange, targetUserId, targetName }: Props) => {
  const { startImpersonation } = useImpersonation();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      toast({
        variant: "destructive",
        title: "Reason required",
        description: "Please provide at least 5 characters explaining why.",
      });
      return;
    }
    setSubmitting(true);
    try {
      await startImpersonation({ targetUserId, reason: trimmed });
      // Page will navigate away on success.
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Impersonation failed",
        description: e instanceof Error ? e.message : "Unknown error",
      });
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Impersonate {targetName}
          </DialogTitle>
          <DialogDescription>
            You will sign in as this user. The action is logged with your identity, the
            timestamp, the reason below, and your IP address. Use "Return to Admin" to
            restore your own session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="impersonation-reason">Reason (required)</Label>
          <Textarea
            id="impersonation-reason"
            placeholder="e.g. Investigating booking issue reported via support ticket #1234"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            rows={4}
            disabled={submitting}
          />
          <p className="text-xs text-muted-foreground">
            Minimum 5 characters. Will be recorded permanently in the audit log.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || reason.trim().length < 5}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Start Impersonation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImpersonateDialog;
