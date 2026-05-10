import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doctorId: string;
  practiceId?: string | null;
  defaultDate?: Date;
  onSaved: () => void;
}

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const BlockTimeDialog = ({ open, onOpenChange, doctorId, practiceId, defaultDate, onSaved }: Props) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    block_type: "lunch",
    reason: "",
    start: toLocalInput(defaultDate || new Date()),
    end: toLocalInput(new Date((defaultDate || new Date()).getTime() + 60 * 60000)),
  });

  useEffect(() => {
    if (defaultDate) {
      setForm((f) => ({
        ...f,
        start: toLocalInput(defaultDate),
        end: toLocalInput(new Date(defaultDate.getTime() + 60 * 60000)),
      }));
    }
  }, [defaultDate, open]);

  const handleSave = async () => {
    const start = new Date(form.start);
    const end = new Date(form.end);
    if (!(end > start)) {
      toast({ variant: "destructive", title: "End must be after start" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("doctor_blocked_times").insert({
      doctor_id: doctorId,
      practice_id: practiceId ?? null,
      block_type: form.block_type,
      reason: form.reason.trim() || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Could not block time", description: error.message });
      return;
    }
    toast({ title: "Time blocked" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Block Time</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={form.block_type} onValueChange={(v) => setForm({ ...form, block_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="break">Break</SelectItem>
                <SelectItem value="leave">Leave / Vacation</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Start *</Label>
              <Input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>End *</Label>
              <Input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Reason (optional)</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Block time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BlockTimeDialog;
