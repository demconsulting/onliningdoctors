import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ChevronLeft, ChevronRight, Plus, Ban, Video, MapPin, Calendar as CalendarIcon, AlertCircle, X } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, isSameDay, eachDayOfInterval } from "date-fns";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import OfflineAppointmentDialog from "./OfflineAppointmentDialog";
import BlockTimeDialog from "./BlockTimeDialog";

type ViewMode = "day" | "week" | "month";

interface Props {
  user: User;
  doctorId: string; // profile_id of the doctor whose calendar we're viewing
  practiceId?: string | null;
  canManage?: boolean; // can create/edit/cancel/block
}

const PracticeCalendar = ({ user, doctorId, practiceId, canManage = true }: Props) => {
  const [view, setView] = useState<ViewMode>("day");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [seedDate, setSeedDate] = useState<Date | undefined>(undefined);

  const range = useMemo(() => {
    if (view === "day") return { from: startOfDay(cursor), to: endOfDay(cursor) };
    if (view === "week") return { from: startOfWeek(cursor, { weekStartsOn: 1 }), to: endOfWeek(cursor, { weekStartsOn: 1 }) };
    return { from: startOfMonth(cursor), to: endOfMonth(cursor) };
  }, [view, cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: appts }, { data: blks }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, doctor_id, patient_id, patient_name, patient_phone, patient_email, scheduled_at, end_time, duration_minutes, status, reason, notes, appointment_type, payment_method_type, medical_aid_request_id, patient:patient_id(full_name)")
        .eq("doctor_id", doctorId)
        .gte("scheduled_at", range.from.toISOString())
        .lte("scheduled_at", range.to.toISOString())
        .order("scheduled_at"),
      supabase
        .from("doctor_blocked_times")
        .select("*")
        .eq("doctor_id", doctorId)
        .lte("start_time", range.to.toISOString())
        .gte("end_time", range.from.toISOString())
        .order("start_time"),
    ]);
    setAppointments(appts || []);
    setBlocks(blks || []);
    setLoading(false);
  }, [doctorId, range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`practice-calendar-${doctorId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `doctor_id=eq.${doctorId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "doctor_blocked_times", filter: `doctor_id=eq.${doctorId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [doctorId, load]);

  const navigate = (dir: -1 | 1) => {
    setCursor((c) => view === "day" ? addDays(c, dir) : view === "week" ? addWeeks(c, dir) : addMonths(c, dir));
  };

  const headerLabel = useMemo(() => {
    if (view === "day") return format(cursor, "EEEE, MMM d, yyyy");
    if (view === "week") return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`;
    return format(cursor, "MMMM yyyy");
  }, [view, cursor, range]);

  // Today's summary widgets
  const today = useMemo(() => {
    const s = startOfDay(new Date());
    const e = endOfDay(new Date());
    const todayAppts = appointments.filter((a) => {
      const d = new Date(a.scheduled_at);
      return d >= s && d <= e && a.status !== "cancelled";
    });
    return {
      total: todayAppts.length,
      online: todayAppts.filter((a) => a.appointment_type === "online").length,
      offline: todayAppts.filter((a) => a.appointment_type === "offline").length,
      upcoming: todayAppts.filter((a) => new Date(a.scheduled_at) > new Date()).length,
      missed: appointments.filter((a) => a.status === "no_show" || a.status === "doctor_no_show").length,
    };
  }, [appointments]);

  const cancelAppointment = async (id: string) => {
    if (!confirm("Cancel this appointment?")) return;
    const { error } = await supabase.from("appointments").update({ status: "cancelled", cancellation_reason: "Cancelled from calendar" }).eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Cancel failed", description: error.message }); return; }
    toast({ title: "Appointment cancelled" });
    load();
  };

  const completeAppointment = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "completed" }).eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Update failed", description: error.message }); return; }
    toast({ title: "Marked completed" });
    load();
  };

  const removeBlock = async (id: string) => {
    if (!confirm("Remove this blocked time?")) return;
    const { error } = await supabase.from("doctor_blocked_times").delete().eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Remove failed", description: error.message }); return; }
    load();
  };

  // ---------- color helpers ----------
  const apptColor = (a: any) => {
    if (a.status === "cancelled") return "bg-destructive/10 text-destructive border-destructive/30";
    if (a.payment_method_type === "medical_aid" && a.status !== "confirmed" && a.status !== "completed") return "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30";
    if (a.appointment_type === "offline") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    return "bg-primary/10 text-primary border-primary/30";
  };

  const apptIcon = (a: any) => a.appointment_type === "offline"
    ? <MapPin className="h-3.5 w-3.5" />
    : <Video className="h-3.5 w-3.5" />;

  // ---------- views ----------
  const renderAppointment = (a: any) => {
    const start = new Date(a.scheduled_at);
    const end = a.end_time ? new Date(a.end_time) : new Date(start.getTime() + (a.duration_minutes || 30) * 60000);
    const name = a.patient?.full_name || a.patient_name || "Patient";
    return (
      <div key={a.id} className={`rounded-lg border p-2.5 text-xs shadow-sm ${apptColor(a)}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-medium">
              {apptIcon(a)}
              <span className="truncate">{name}</span>
            </div>
            <div className="mt-0.5 opacity-80">
              {format(start, "HH:mm")} – {format(end, "HH:mm")}
            </div>
            {a.reason && <div className="mt-1 truncate opacity-70">{a.reason}</div>}
            <Badge variant="outline" className="mt-1.5 text-[10px] capitalize">{a.status.replace("_", " ")}</Badge>
          </div>
          {canManage && a.status !== "cancelled" && a.status !== "completed" && (
            <div className="flex flex-col gap-1">
              {a.appointment_type === "offline" && (
                <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => { setEditing(a); setOfflineOpen(true); }}>Edit</Button>
              )}
              {a.appointment_type === "online" && a.status === "confirmed" && (
                <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" asChild>
                  <a href={`/call/${a.id}`}>Join</a>
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => completeAppointment(a.id)}>Done</Button>
              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-destructive" onClick={() => cancelAppointment(a.id)}>Cancel</Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBlock = (b: any) => (
    <div key={b.id} className="rounded-lg border border-muted bg-muted/40 p-2.5 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-medium capitalize">
            <Ban className="h-3.5 w-3.5" /> {b.block_type}
          </div>
          <div className="mt-0.5 text-muted-foreground">
            {format(new Date(b.start_time), "MMM d HH:mm")} – {format(new Date(b.end_time), "MMM d HH:mm")}
          </div>
          {b.reason && <div className="mt-1 truncate text-muted-foreground">{b.reason}</div>}
        </div>
        {canManage && (
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removeBlock(b.id)}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );

  const itemsForDay = (day: Date) => {
    const a = appointments.filter((x) => isSameDay(new Date(x.scheduled_at), day));
    const b = blocks.filter((x) => {
      const s = new Date(x.start_time), e = new Date(x.end_time);
      return (s <= endOfDay(day) && e >= startOfDay(day));
    });
    return { a, b };
  };

  const renderDay = () => {
    const { a, b } = itemsForDay(cursor);
    if (!a.length && !b.length) {
      return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No appointments or blocks for this day.</div>;
    }
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {b.map(renderBlock)}
        {a.map(renderAppointment)}
      </div>
    );
  };

  const renderWeek = () => {
    const days = eachDayOfInterval({ start: range.from, end: range.to });
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
        {days.map((d) => {
          const { a, b } = itemsForDay(d);
          return (
            <div key={d.toISOString()} className="min-h-[140px] rounded-lg border p-2">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold">{format(d, "EEE d")}</div>
                {(a.length + b.length) > 0 && <Badge variant="outline" className="text-[10px]">{a.length + b.length}</Badge>}
              </div>
              <div className="space-y-1.5">
                {b.slice(0, 5).map(renderBlock)}
                {a.slice(0, 5).map(renderAppointment)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonth = () => {
    const start = startOfWeek(range.from, { weekStartsOn: 1 });
    const end = endOfWeek(range.to, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    return (
      <div className="grid grid-cols-7 gap-1.5">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground">{d}</div>
        ))}
        {days.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const { a, b } = itemsForDay(d);
          const total = a.length + b.length;
          return (
            <button
              key={d.toISOString()}
              onClick={() => { setCursor(d); setView("day"); }}
              className={`min-h-[78px] rounded-lg border p-1.5 text-left transition hover:border-primary ${inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground"}`}
            >
              <div className="text-xs font-medium">{format(d, "d")}</div>
              {total > 0 && (
                <div className="mt-1 space-y-0.5">
                  {a.slice(0, 2).map((x) => (
                    <div key={x.id} className={`truncate rounded px-1 py-0.5 text-[10px] ${apptColor(x)}`}>
                      {format(new Date(x.scheduled_at), "HH:mm")} {x.patient?.full_name || x.patient_name || "Patient"}
                    </div>
                  ))}
                  {total > 2 && <div className="text-[10px] text-muted-foreground">+{total - 2} more</div>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary widgets */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Today", value: today.total, icon: CalendarIcon },
          { label: "Online", value: today.online, icon: Video },
          { label: "Offline", value: today.offline, icon: MapPin },
          { label: "Upcoming", value: today.upcoming, icon: ChevronRight },
          { label: "Missed", value: today.missed, icon: AlertCircle },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-2xl font-semibold">{s.value}</div>
              </div>
              <s.icon className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>Today</Button>
              <Button size="icon" variant="outline" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
              <CardTitle className="ml-2 font-display text-base sm:text-lg">{headerLabel}</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
              {canManage && (
                <>
                  <Button size="sm" variant="outline" onClick={() => { setSeedDate(cursor); setBlockOpen(true); }}>
                    <Ban className="mr-1.5 h-4 w-4" /> Block
                  </Button>
                  <Button size="sm" onClick={() => { setEditing(null); setSeedDate(cursor); setOfflineOpen(true); }}>
                    <Plus className="mr-1.5 h-4 w-4" /> Offline appt
                  </Button>
                </>
              )}
            </div>
          </div>
          {/* legend */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary" /> Online</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Offline</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-orange-500" /> Medical aid pending</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-muted-foreground/50" /> Blocked</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-destructive" /> Cancelled</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : view === "day" ? renderDay() : view === "week" ? renderWeek() : renderMonth()}
        </CardContent>
      </Card>

      {/* Mobile FAB */}
      {canManage && (
        <Button
          className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg sm:hidden"
          onClick={() => { setEditing(null); setSeedDate(cursor); setOfflineOpen(true); }}
          aria-label="Add offline appointment"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <OfflineAppointmentDialog
        open={offlineOpen}
        onOpenChange={setOfflineOpen}
        doctorId={doctorId}
        defaultDate={seedDate}
        appointment={editing}
        onSaved={load}
      />
      <BlockTimeDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        doctorId={doctorId}
        practiceId={practiceId}
        defaultDate={seedDate}
        onSaved={load}
      />
    </div>
  );
};

export default PracticeCalendar;
