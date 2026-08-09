import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { DIGITAL_SERVICES, SERVICE_STATUSES } from "./constants";

interface Props {
  doctorProfileId: string | null;
  doctorName?: string;
  onClose: () => void;
}

const DigitalServicesDialog = ({ doctorProfileId, doctorName, onClose }: Props) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!doctorProfileId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("doctor_digital_services" as any)
        .select("*")
        .eq("doctor_profile_id", doctorProfileId);
      const map: Record<string, any> = {};
      ((data as any[]) || []).forEach((r) => { map[r.service_type] = r; });
      setRows(map);
      setLoading(false);
    })();
  }, [doctorProfileId]);

  const toggle = (key: string, on: boolean) => {
    setRows((prev) => {
      const next = { ...prev };
      if (on) next[key] = { ...(next[key] || {}), service_type: key, status: next[key]?.status || "pending" };
      else delete next[key];
      return next;
    });
  };

  const patch = (key: string, field: string, value: any) =>
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const save = async () => {
    if (!doctorProfileId) return;
    setSaving(true);
    const selected = Object.values(rows);
    const keep = selected.map((r: any) => r.service_type);

    const del = supabase.from("doctor_digital_services" as any).delete().eq("doctor_profile_id", doctorProfileId);
    const { error: delErr } = keep.length
      ? await del.not("service_type", "in", `(${keep.join(",")})`)
      : await del;

    let upErr: any = null;
    if (selected.length) {
      const { error } = await supabase.from("doctor_digital_services" as any).upsert(
        selected.map((r: any) => ({
          doctor_profile_id: doctorProfileId,
          service_type: r.service_type,
          status: r.status || "pending",
          notes: r.notes || null,
          completed_at: ["completed", "live"].includes(r.status) ? new Date().toISOString() : null,
        })),
        { onConflict: "doctor_profile_id,service_type" },
      );
      upErr = error;
    }
    setSaving(false);
    const error = delErr || upErr;
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Digital practice services saved" }); onClose(); }
  };

  return (
    <Dialog open={!!doctorProfileId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Digital Practice Services</DialogTitle>
          <DialogDescription>
            Optional services for {doctorName || "this doctor"}. Only the services you select are tracked.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            {DIGITAL_SERVICES.map((s) => {
              const row = rows[s.key];
              return (
                <div key={s.key} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id={s.key} checked={!!row} onCheckedChange={(v) => toggle(s.key, !!v)} />
                    <label htmlFor={s.key} className="text-sm font-medium cursor-pointer">{s.label}</label>
                  </div>
                  {row && (
                    <div className="space-y-2 pl-6">
                      <Select value={row.status || "pending"} onValueChange={(v) => patch(s.key, "status", v)}>
                        <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SERVICE_STATUSES.map((st) => <SelectItem key={st.key} value={st.key}>{st.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Textarea
                        placeholder="Notes"
                        value={row.notes || ""}
                        onChange={(e) => patch(s.key, "notes", e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DigitalServicesDialog;
