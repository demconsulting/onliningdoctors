import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Clock, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface AvailabilityManagerProps {
  user: User;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DaySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  slot_duration_minutes: number;
}

const defaultSlot = (day: number): DaySlot => ({
  day_of_week: day,
  start_time: "09:00",
  end_time: "17:00",
  is_available: false,
  slot_duration_minutes: 30,
});

const AvailabilityManager = ({ user }: AvailabilityManagerProps) => {
  const [slots, setSlots] = useState<DaySlot[]>(DAYS.map((_, i) => defaultSlot(i)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("doctor_availability")
      .select("*")
      .eq("doctor_id", user.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const merged = DAYS.map((_, i) => {
            const existing = data.find(d => d.day_of_week === i);
            return existing
              ? { ...existing, start_time: existing.start_time.slice(0, 5), end_time: existing.end_time.slice(0, 5) }
              : defaultSlot(i);
          });
          setSlots(merged);
        }
        setLoading(false);
      });
  }, [user.id]);

  const updateSlot = (index: number, updates: Partial<DaySlot>) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const handleSave = async () => {
    setSaving(true);

    // Delete existing then re-insert
    await supabase.from("doctor_availability").delete().eq("doctor_id", user.id);

    const rows = slots
      .filter(s => s.is_available)
      .map(s => ({
        doctor_id: user.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        is_available: true,
        slot_duration_minutes: s.slot_duration_minutes,
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from("doctor_availability").insert(rows);
      if (error) {
        toast({ variant: "destructive", title: "Error saving availability", description: error.message });
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast({ title: "Availability updated" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Clock className="h-5 w-5 text-primary" /> Weekly Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {slots.map((slot, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex w-28 items-center gap-2">
              <Switch checked={slot.is_available} onCheckedChange={(v) => updateSlot(i, { is_available: v })} />
              <span className="text-sm font-medium text-foreground">{DAYS[i]}</span>
            </div>
            {slot.is_available && (
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Start</Label>
                  <Input type="time" value={slot.start_time} onChange={(e) => updateSlot(i, { start_time: e.target.value })} className="w-32" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End</Label>
                  <Input type="time" value={slot.end_time} onChange={(e) => updateSlot(i, { end_time: e.target.value })} className="w-32" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Slot (min)</Label>
                  <Input type="number" min={10} max={120} value={slot.slot_duration_minutes} onChange={(e) => updateSlot(i, { slot_duration_minutes: Number(e.target.value) })} className="w-20" />
                </div>
              </div>
            )}
          </div>
        ))}
        <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary border-0 text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Availability
        </Button>
      </CardContent>
    </Card>
  );
};

export default AvailabilityManager;
