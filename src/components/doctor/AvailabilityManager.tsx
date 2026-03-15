import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Clock, Save, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface AvailabilityManagerProps {
  user: User;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface TimeRange {
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

interface DayConfig {
  is_enabled: boolean;
  ranges: TimeRange[];
}

const defaultRange = (): TimeRange => ({
  start_time: "09:00",
  end_time: "17:00",
  slot_duration_minutes: 30,
});

const AvailabilityManager = ({ user }: AvailabilityManagerProps) => {
  const [days, setDays] = useState<DayConfig[]>(
    DAYS.map(() => ({ is_enabled: false, ranges: [defaultRange()] }))
  );
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
          const grouped: DayConfig[] = DAYS.map((_, i) => {
            const dayRows = data.filter(d => d.day_of_week === i);
            if (dayRows.length > 0) {
              return {
                is_enabled: true,
                ranges: dayRows.map(r => ({
                  start_time: r.start_time.slice(0, 5),
                  end_time: r.end_time.slice(0, 5),
                  slot_duration_minutes: r.slot_duration_minutes ?? 30,
                })),
              };
            }
            return { is_enabled: false, ranges: [defaultRange()] };
          });
          setDays(grouped);
        }
        setLoading(false);
      });
  }, [user.id]);

  const toggleDay = (dayIndex: number, enabled: boolean) => {
    setDays(prev =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, is_enabled: enabled, ranges: enabled && d.ranges.length === 0 ? [defaultRange()] : d.ranges }
          : d
      )
    );
  };

  const updateRange = (dayIndex: number, rangeIndex: number, updates: Partial<TimeRange>) => {
    setDays(prev =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, ranges: d.ranges.map((r, ri) => (ri === rangeIndex ? { ...r, ...updates } : r)) }
          : d
      )
    );
  };

  const addRange = (dayIndex: number) => {
    setDays(prev =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, ranges: [...d.ranges, defaultRange()] } : d
      )
    );
  };

  const removeRange = (dayIndex: number, rangeIndex: number) => {
    setDays(prev =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, ranges: d.ranges.filter((_, ri) => ri !== rangeIndex) }
          : d
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);

    // Delete existing then re-insert
    await supabase.from("doctor_availability").delete().eq("doctor_id", user.id);

    const rows: {
      doctor_id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_available: boolean;
      slot_duration_minutes: number;
    }[] = [];

    days.forEach((day, i) => {
      if (!day.is_enabled) return;
      day.ranges.forEach(r => {
        if (r.start_time && r.end_time && r.start_time < r.end_time) {
          rows.push({
            doctor_id: user.id,
            day_of_week: i,
            start_time: r.start_time,
            end_time: r.end_time,
            is_available: true,
            slot_duration_minutes: r.slot_duration_minutes,
          });
        }
      });
    });

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

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Clock className="h-5 w-5 text-primary" /> Weekly Availability
        </CardTitle>
        <p className="text-sm text-muted-foreground">Add multiple time ranges per day for flexible scheduling.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {days.map((day, dayIdx) => (
          <div key={dayIdx} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={day.is_enabled} onCheckedChange={(v) => toggleDay(dayIdx, v)} />
              <span className="text-sm font-medium text-foreground w-24">{DAYS[dayIdx]}</span>
              {day.is_enabled && (
                <span className="text-xs text-muted-foreground">
                  {day.ranges.length} time {day.ranges.length === 1 ? "range" : "ranges"}
                </span>
              )}
            </div>

            {day.is_enabled && (
              <div className="ml-0 sm:ml-10 space-y-2">
                {day.ranges.map((range, rangeIdx) => (
                  <div key={rangeIdx} className="flex flex-wrap items-end gap-3 rounded-md bg-muted/50 p-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Start</Label>
                      <Input
                        type="time"
                        value={range.start_time}
                        onChange={(e) => updateRange(dayIdx, rangeIdx, { start_time: e.target.value })}
                        className="w-32"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End</Label>
                      <Input
                        type="time"
                        value={range.end_time}
                        onChange={(e) => updateRange(dayIdx, rangeIdx, { end_time: e.target.value })}
                        className="w-32"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Slot (min)</Label>
                      <Input
                        type="number"
                        min={10}
                        max={120}
                        value={range.slot_duration_minutes}
                        onChange={(e) => updateRange(dayIdx, rangeIdx, { slot_duration_minutes: Number(e.target.value) })}
                        className="w-20"
                      />
                    </div>
                    {day.ranges.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => removeRange(dayIdx, rangeIdx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => addRange(dayIdx)}
                >
                  <Plus className="h-3.5 w-3.5" /> Add time range
                </Button>
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
