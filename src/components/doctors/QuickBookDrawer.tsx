import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarClock, User as UserIcon, ShieldCheck, CreditCard, HeartPulse, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrencySymbol, COUNTRY_CURRENCY } from "@/lib/currency";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { Doctor } from "./DoctorCardNew";

interface QuickBookDrawerProps {
  doctor: Doctor | null;
  defaultAt?: string | null; // ISO string of preferred slot
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Slot {
  startAt: Date;
  endAt: Date;
}

const DAYS_HORIZON = 7;

const countryCodeFor = (country?: string | null): string | null => {
  if (!country) return null;
  if (country.length === 2) return country.toUpperCase();
  const map: Record<string, string> = {
    "South Africa": "ZA", "Nigeria": "NG", "Kenya": "KE", "Ghana": "GH",
    "Tanzania": "TZ", "Uganda": "UG", "Egypt": "EG", "Ethiopia": "ET",
    "Rwanda": "RW", "United States": "US", "United Kingdom": "GB", "India": "IN",
    "Botswana": "BW", "Zimbabwe": "ZW", "Mozambique": "MZ", "Namibia": "NA",
  };
  return map[country] || null;
};

const QuickBookDrawer = ({ doctor, defaultAt, open, onOpenChange }: QuickBookDrawerProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<Array<{ day_of_week: number; start_time: string; end_time: string; slot_duration_minutes: number | null }>>([]);
  const [busy, setBusy] = useState<Array<{ s: Date; e: Date }>>([]);
  const [dependents, setDependents] = useState<Array<{ id: string; full_name: string; relationship: string }>>([]);
  const [forWhom, setForWhom] = useState<string>("self");
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [reason, setReason] = useState("");
  const [payMethod, setPayMethod] = useState<"card" | "medical_aid">("card");
  const [reservationId, setReservationId] = useState<string | null>(null);

  // Reset state when reopening
  useEffect(() => {
    if (!open) {
      setSelectedStart(null);
      setReason("");
      setReservationId(null);
    }
  }, [open]);

  // Fetch auth + patient data when the drawer opens
  useEffect(() => {
    if (!open || !doctor) return;
    let cancelled = false;
    setCheckingAuth(true);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        // Preserve intent, punt to login, come back to /doctors?book=…&at=…
        const params = new URLSearchParams();
        params.set("book", doctor.profile_id);
        if (defaultAt) params.set("at", defaultAt);
        const redirect = `/doctors?${params.toString()}`;
        onOpenChange(false);
        navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email ?? null);
      setCheckingAuth(false);
      setLoading(true);
      const [availRes, busyRes, depsRes] = await Promise.all([
        supabase
          .from("doctor_availability")
          .select("day_of_week,start_time,end_time,slot_duration_minutes,is_available")
          .eq("doctor_id", doctor.profile_id)
          .eq("is_available", true),
        supabase.rpc("get_doctor_blocked_slots" as any, { _doctor_id: doctor.profile_id }),
        supabase.from("dependents").select("id, full_name, relationship").eq("guardian_id", user.id),
      ]);
      // Also pull existing appointments to filter taken slots client-side (best-effort)
      const { data: appts } = await supabase
        .from("appointments")
        .select("scheduled_at,end_time,duration_minutes,status")
        .eq("doctor_id", doctor.profile_id)
        .in("status", ["pending", "confirmed", "awaiting_payment"])
        .gte("scheduled_at", new Date().toISOString());
      if (cancelled) return;
      setAvailability((availRes.data as any) || []);
      const blocked: Array<{ s: Date; e: Date }> = (busyRes.data as any[] || []).map((b) => ({
        s: new Date(b.start_time), e: new Date(b.end_time),
      }));
      const taken: Array<{ s: Date; e: Date }> = (appts || []).map((a: any) => {
        const s = new Date(a.scheduled_at);
        const e = a.end_time
          ? new Date(a.end_time)
          : new Date(s.getTime() + (a.duration_minutes || 30) * 60000);
        return { s, e };
      });
      setBusy([...blocked, ...taken]);
      setDependents((depsRes.data as any) || []);
      setLoading(false);

      // Default payment method based on doctor's accepted methods
      const apm = (doctor as any).accepted_payment_method || "both";
      setPayMethod(apm === "medical_aid_only" ? "medical_aid" : "card");
    })();
    return () => { cancelled = true; };
  }, [open, doctor, defaultAt, navigate, onOpenChange]);

  // Compute upcoming free slots for the next N days
  const slots: Slot[] = useMemo(() => {
    if (!availability.length) return [];
    const out: Slot[] = [];
    const now = new Date();
    for (let d = 0; d < DAYS_HORIZON; d++) {
      const day = addDays(startOfDay(now), d);
      const dow = day.getDay();
      const daySlots = availability.filter((a) => a.day_of_week === dow);
      for (const s of daySlots) {
        const dur = s.slot_duration_minutes ?? 30;
        const [sh, sm] = s.start_time.split(":").map(Number);
        const [eh, em] = s.end_time.split(":").map(Number);
        const start = new Date(day); start.setHours(sh, sm, 0, 0);
        const end = new Date(day); end.setHours(eh, em, 0, 0);
        let cur = new Date(start);
        while (cur.getTime() + dur * 60000 <= end.getTime()) {
          const slotEnd = new Date(cur.getTime() + dur * 60000);
          if (cur > now && !busy.some((b) => cur < b.e && slotEnd > b.s)) {
            out.push({ startAt: new Date(cur), endAt: slotEnd });
          }
          cur = new Date(cur.getTime() + dur * 60000);
        }
      }
    }
    return out.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }, [availability, busy]);

  // Preselect the requested slot (if still valid) or the earliest available
  useEffect(() => {
    if (!open || loading || !slots.length || selectedStart) return;
    if (defaultAt) {
      const target = new Date(defaultAt).getTime();
      const match = slots.find((s) => s.startAt.getTime() === target);
      if (match) { setSelectedStart(match.startAt); return; }
    }
    setSelectedStart(slots[0].startAt);
  }, [open, loading, slots, defaultAt, selectedStart]);

  // Group slots by day for rendering
  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = format(s.startAt, "yyyy-MM-dd");
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    }
    return Array.from(map.entries()).slice(0, DAYS_HORIZON);
  }, [slots]);

  const doctorCountry = doctor?.profile?.country ?? null;
  const currencySymbol = getCurrencySymbol(doctorCountry);
  const dCode = countryCodeFor(doctorCountry);
  const currencyCode = (dCode && COUNTRY_CURRENCY[dCode]?.currency) || "NGN";
  const fee = doctor?.consultation_fee != null ? Number(doctor.consultation_fee) : 0;
  const acceptedPm = (doctor as any)?.accepted_payment_method || "both";
  const allowCard = acceptedPm === "card_only" || acceptedPm === "both";
  const allowAid = acceptedPm === "medical_aid_only" || acceptedPm === "both";

  const releaseReservation = useCallback(async (id: string | null) => {
    if (!id) return;
    await (supabase as any).rpc("release_appointment_slot", { _reservation_id: id }).catch(() => null);
  }, []);

  const handleClose = useCallback(async (next: boolean) => {
    if (!next && reservationId) await releaseReservation(reservationId);
    onOpenChange(next);
  }, [reservationId, releaseReservation, onOpenChange]);

  const handleConfirm = async () => {
    if (!doctor || !userId || !selectedStart) return;
    if (payMethod === "medical_aid") {
      // Medical aid flow is more involved — hand off to the full booking page.
      const params = new URLSearchParams();
      params.set("book", doctor.profile_id);
      params.set("at", selectedStart.toISOString());
      params.set("method", "medical_aid");
      navigate(`/dashboard?${params.toString()}`);
      return;
    }
    setSubmitting(true);
    const slotEnd = new Date(selectedStart.getTime() + 30 * 60000);
    // 1. Reserve the slot atomically
    const { data: resId, error: resErr } = await (supabase as any).rpc("reserve_appointment_slot", {
      _doctor_id: doctor.profile_id,
      _start: selectedStart.toISOString(),
      _end: slotEnd.toISOString(),
    });
    if (resErr) {
      setSubmitting(false);
      toast({
        variant: "destructive",
        title: "This appointment time has just been booked",
        description: "Please select another available time.",
      });
      // Force slot refresh
      setBusy((b) => [...b, { s: selectedStart, e: slotEnd }]);
      setSelectedStart(null);
      return;
    }
    setReservationId(resId as string);

    // 2. Create the appointment (awaiting payment)
    const { data: appt, error: apptErr } = await supabase.from("appointments").insert({
      patient_id: userId,
      doctor_id: doctor.profile_id,
      dependent_id: forWhom === "self" ? null : forWhom,
      scheduled_at: selectedStart.toISOString(),
      duration_minutes: 30,
      reason: reason.trim() || null,
      status: fee > 0 ? "awaiting_payment" : "pending",
      payment_method_type: "card",
      pricing_tier_type: "private",
    } as any).select("id").single();

    if (apptErr) {
      setSubmitting(false);
      await releaseReservation(resId as string);
      toast({ variant: "destructive", title: "Booking failed", description: apptErr.message });
      return;
    }

    // Link reservation to appointment (best-effort)
    await supabase.from("slot_reservations" as any)
      .update({ appointment_id: appt.id })
      .eq("id", resId as string)
      .then(() => null, () => null);

    // 3. If no fee, we're done.
    if (fee <= 0) {
      setSubmitting(false);
      toast({ title: "Appointment booked!" });
      onOpenChange(false);
      navigate("/dashboard");
      return;
    }

    // 4. Initialize payment (Paystack)
    const origin = window.location.origin;
    const isWebProd = /^https?:\/\//i.test(origin) && !/localhost|127\.0\.0\.1|capacitor:|file:/i.test(origin);
    const callbackBase = isWebProd ? origin : "https://doctorsonlining.com";
    try {
      const { data: payData, error: payErr } = await supabase.functions.invoke("paystack-payment", {
        body: {
          action: "initialize",
          appointment_id: appt.id,
          currency: currencyCode,
          email: userEmail,
          doctor_id: doctor.profile_id,
          callback_url: `${callbackBase}/dashboard`,
          consultation_type: "private",
          payment_method: "card",
          transaction_type: "card_consultation",
        },
      });
      if (payErr || (payData as any)?.error) {
        setSubmitting(false);
        await releaseReservation(resId as string);
        toast({ variant: "destructive", title: "Payment failed to start", description: (payData as any)?.error || payErr?.message || "Try again" });
        return;
      }
      if ((payData as any)?.authorization_url) {
        window.location.href = (payData as any).authorization_url;
        return;
      }
    } catch (err: any) {
      setSubmitting(false);
      await releaseReservation(resId as string);
      toast({ variant: "destructive", title: "Payment error", description: err.message || "Unexpected error" });
    }
  };

  if (!doctor) return null;
  const name = doctor.profile?.full_name || "Doctor";
  const displayName = `${doctor.title ? `${doctor.title} ` : "Dr. "}${name}`;

  const summaryLabel = selectedStart
    ? (() => {
        const today = new Date();
        const tomorrow = addDays(today, 1);
        if (isSameDay(selectedStart, today)) return `Today, ${format(selectedStart, "HH:mm")}`;
        if (isSameDay(selectedStart, tomorrow)) return `Tomorrow, ${format(selectedStart, "HH:mm")}`;
        return format(selectedStart, "EEE d MMM, HH:mm");
      })()
    : null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col p-0 gap-0",
          isMobile ? "h-[92vh] rounded-t-2xl" : "w-full sm:max-w-md"
        )}
      >
        <SheetHeader className="p-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-3 text-left">
            {doctor.profile?.avatar_url ? (
              <img src={doctor.profile.avatar_url} alt={displayName} className="h-12 w-12 rounded-full object-cover ring-1 ring-border" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <UserIcon className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display text-base font-semibold truncate">{displayName}</p>
              <p className="text-xs font-normal text-muted-foreground truncate">{doctor.specialty?.name}</p>
            </div>
          </SheetTitle>
          <SheetDescription className="text-left">
            {fee > 0 ? (
              <span className="text-foreground font-medium">{currencySymbol}{fee.toFixed(0)} · Online video consultation</span>
            ) : (
              <span>Online video consultation</span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {checkingAuth || loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
              <CalendarClock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No appointments currently available in the next {DAYS_HORIZON} days.
              </p>
            </div>
          ) : (
            <>
              {dependents.length > 0 && (
                <div className="space-y-2">
                  <Label>Who is this consultation for?</Label>
                  <Select value={forWhom} onValueChange={setForWhom}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">Myself</SelectItem>
                      {dependents.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.full_name} ({d.relationship})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Choose a time</Label>
                  {summaryLabel && (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" /> {summaryLabel}
                    </Badge>
                  )}
                </div>
                <div className="space-y-3">
                  {slotsByDay.map(([dayKey, daySlots]) => {
                    const day = new Date(dayKey);
                    const today = new Date();
                    const tomorrow = addDays(today, 1);
                    const label = isSameDay(day, today)
                      ? "Today"
                      : isSameDay(day, tomorrow)
                      ? "Tomorrow"
                      : format(day, "EEE d MMM");
                    return (
                      <div key={dayKey}>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                          {daySlots.slice(0, 12).map((s) => {
                            const active = selectedStart?.getTime() === s.startAt.getTime();
                            return (
                              <Button
                                key={s.startAt.toISOString()}
                                type="button"
                                size="sm"
                                variant={active ? "default" : "outline"}
                                className={cn("text-xs", active && "ring-2 ring-primary ring-offset-1")}
                                onClick={() => setSelectedStart(s.startAt)}
                              >
                                {format(s.startAt, "HH:mm")}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(allowCard && allowAid) && (
                <div className="space-y-2">
                  <Label>Payment method</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayMethod("card")}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                        payMethod === "card" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/40"
                      )}
                    >
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="font-medium">Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod("medical_aid")}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                        payMethod === "medical_aid" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/40"
                      )}
                    >
                      <HeartPulse className="h-4 w-4 text-primary" />
                      <span className="font-medium">Medical Aid</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Briefly tell the doctor what you need help with</span>
                  <span className="text-xs font-normal text-muted-foreground">Optional</span>
                </Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. Persistent headache for 3 days"
                />
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Doctor</span>
                  <span className="font-medium">{displayName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Date &amp; time</span>
                  <span className="font-medium">{summaryLabel || "—"}</span>
                </div>
                {fee > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-primary/10 mt-2">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold text-foreground">{currencySymbol}{fee.toFixed(2)} {currencyCode}</span>
                  </div>
                )}
              </div>

              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure booking · POPIA compliant · Slot held for 5 minutes
              </p>
            </>
          )}
        </div>

        {!checkingAuth && !loading && slots.length > 0 && (
          <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur p-4">
            <Button
              className="w-full gradient-primary border-0 text-primary-foreground"
              size="lg"
              disabled={!selectedStart || submitting}
              onClick={handleConfirm}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : payMethod === "medical_aid" ? (
                "Continue with Medical Aid"
              ) : fee > 0 ? (
                <>Confirm &amp; Pay {currencySymbol}{fee.toFixed(0)}</>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default QuickBookDrawer;
