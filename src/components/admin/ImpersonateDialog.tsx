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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, UserCog, ShieldAlert, Clock, FileText } from "lucide-react";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetName: string;
  targetEmail?: string | null;
  targetRole?: string | null;
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

const ImpersonateDialog = ({
  open,
  onOpenChange,
  targetUserId,
  targetName,
  targetEmail,
  targetRole,
}: Props) => {
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
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/60">
        {/* Themed header strip */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/60 px-6 py-5">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/20">
                <UserCog className="h-4.5 w-4.5" />
              </span>
              <DialogTitle className="text-lg font-display">
                Impersonate user
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              You will sign in as this user. Every action you take will be performed
              as them and is recorded in the admin audit log.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Target preview card */}
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <Avatar className="h-11 w-11 ring-1 ring-border">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials(targetName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground truncate">{targetName}</div>
              {targetEmail ? (
                <div className="text-xs text-muted-foreground truncate">{targetEmail}</div>
              ) : null}
            </div>
            {targetRole ? (
              <span className="text-[10px] uppercase tracking-wide rounded-full bg-primary/10 text-primary px-2 py-1 font-semibold">
                {targetRole}
              </span>
            ) : null}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="impersonation-reason" className="flex items-center gap-1.5 text-sm">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Reason for impersonation
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="impersonation-reason"
              placeholder="e.g. Investigating booking issue from support ticket #1234"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              rows={4}
              disabled={submitting}
              className="resize-none bg-background"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Minimum 5 characters. Stored permanently.</span>
              <span>{reason.length}/1000</span>
            </div>
          </div>

          {/* Notice */}
          <div className="flex gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-foreground/80">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Use with caution</p>
              <p className="text-muted-foreground">
                A banner will remain visible while impersonating. Use{" "}
                <span className="font-medium text-foreground">Return to Admin</span> to
                restore your session. <Clock className="inline h-3 w-3 -mt-0.5" /> Your IP,
                user agent, and timestamp are recorded.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || reason.trim().length < 5}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCog className="h-4 w-4" />
            )}
            {submitting ? "Starting…" : "Start impersonation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImpersonateDialog;
