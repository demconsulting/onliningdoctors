import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, History, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Scope = "future_only" | "selected_payments" | "all_historical";

interface Props {
  /** Optional preselected payment ids (used when admin selected rows on Revenue tab). */
  selectedPaymentIds?: string[];
  onComplete?: () => void;
}

const RecalcProcessingFees = ({ selectedPaymentIds = [], onComplete }: Props) => {
  const { toast } = useToast();
  const [currentPct, setCurrentPct] = useState<number>(3.5);
  const [newPct, setNewPct] = useState<string>("3.5");
  const [scope, setScope] = useState<Scope>("future_only");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const loadCurrent = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "default_processing_fee_percent")
      .maybeSingle();
    const v = data ? Number(data.value as any) : 3.5;
    setCurrentPct(v);
    setNewPct(String(v));
    const { data: l } = await supabase
      .from("financial_recalculation_logs")
      .select("*")
      .order("recalculation_date", { ascending: false })
      .limit(10);
    setLogs(l || []);
  };
  useEffect(() => { loadCurrent(); }, []);

  const run = async () => {
    const pct = parseFloat(newPct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast({ variant: "destructive", title: "Invalid percentage" });
      return;
    }
    if (scope === "selected_payments" && selectedPaymentIds.length === 0) {
      toast({ variant: "destructive", title: "No payments selected" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_recalculate_processing_fees", {
      _new_pct: pct,
      _scope: scope,
      _payment_ids: scope === "selected_payments" ? selectedPaymentIds : null,
      _notes: notes || null,
    });
    setBusy(false);
    if (error) {
      toast({ variant: "destructive", title: "Recalculation failed", description: error.message });
      return;
    }
    const updated = (data as any)?.payments_updated ?? 0;
    toast({
      title: "Recalculation complete",
      description: `Updated ${updated} payment(s). New processing fee: ${pct}%`,
    });
    await loadCurrent();
    onComplete?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5 text-primary" /> Processing Fee — Historical Recalculation
        </CardTitle>
        <CardDescription>
          Current default: <Badge variant="secondary">{currentPct}%</Badge>. Updating the rate
          changes future payments. Optionally recalculate past successful payments to refresh
          revenue, doctor earnings, and payout figures.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>New processing fee %</Label>
            <Input
              type="number" min={0} max={100} step={0.01}
              value={newPct} onChange={(e) => setNewPct(e.target.value)}
            />
          </div>
          <div>
            <Label>Notes (audit log)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional reason" />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Scope</Label>
          <RadioGroup value={scope} onValueChange={(v) => setScope(v as Scope)} className="space-y-2">
            <label className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value="future_only" id="s1" className="mt-1" />
              <div>
                <div className="text-sm font-medium">Future payments only</div>
                <div className="text-xs text-muted-foreground">Updates the default rate. No historical changes.</div>
              </div>
            </label>
            <label className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value="selected_payments" id="s2" className="mt-1" />
              <div>
                <div className="text-sm font-medium">
                  Selected past payments {selectedPaymentIds.length > 0 && <Badge variant="outline" className="ml-1">{selectedPaymentIds.length} selected</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">Recalculates only the payments you selected on the Revenue tab.</div>
              </div>
            </label>
            <label className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value="all_historical" id="s3" className="mt-1" />
              <div>
                <div className="text-sm font-medium">All historical successful payments</div>
                <div className="text-xs text-muted-foreground">
                  Includes successful/completed and admin-converted legacy payments. Skips failed,
                  expired, cancelled, refunded, and test-excluded payments.
                </div>
              </div>
            </label>
          </RadioGroup>
        </div>

        <Textarea className="hidden" />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {scope === "future_only" ? "Update default rate" : "Recalculate now"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm recalculation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to recalculate historical processing fees? This will update
                financial reports, doctor earnings, and payout calculations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={run}>Yes, apply</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {logs.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium">
              <History className="h-4 w-4" /> Recent recalculations
            </div>
            <div className="space-y-1 text-xs">
              {logs.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1">
                  <span>{format(new Date(l.recalculation_date), "MMM dd, yyyy HH:mm")}</span>
                  <span className="text-muted-foreground">
                    {l.old_processing_fee_percentage ?? "—"}% → <strong className="text-foreground">{l.new_processing_fee_percentage}%</strong>
                  </span>
                  <Badge variant="outline" className="capitalize">{String(l.scope).replace(/_/g, " ")}</Badge>
                  <span>{l.payments_updated} updated</span>
                  {l.notes && <span className="text-muted-foreground truncate max-w-[200px]">{l.notes}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecalcProcessingFees;
