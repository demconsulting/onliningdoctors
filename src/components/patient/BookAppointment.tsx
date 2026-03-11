import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

import { Calendar, Loader2, Star, MapPin, ExternalLink, Coins, Clock, Search, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import SuggestionChips from "@/components/shared/SuggestionChips";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getCurrencySymbol } from "@/lib/currency";
import { format, getDay, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface BookAppointmentProps {
  user: User;
  onBooked?: () => void;
}

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean | null;
  slot_duration_minutes: number | null;
}

const COMMON_REASONS = [
  "General check-up", "Flu / Cold symptoms", "Headache / Migraine",
  "Skin condition", "Stomach / Digestive issues", "Back / Joint pain",
  "Follow-up consultation", "Prescription refill", "Mental health concern",
  "Chronic disease management", "Lab results review", "Second opinion"
];

function generateTimeSlots(startTime: string, endTime: string, durationMin: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let current = sh * 60 + sm;
  const end = eh * 60 + em;
  while (current + durationMin <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    current += durationMin;
  }
  return slots;
}

function formatSlotTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getTimezoneFromCountry(countryCode: string | null): { name: string; abbreviation: string } {
  const timezones: Record<string, { name: string; abbreviation: string }> = {
    ZA: { name: "South Africa Standard Time", abbreviation: "SAST" },
    NG: { name: "West Africa Time", abbreviation: "WAT" },
    KE: { name: "East Africa Time", abbreviation: "EAT" },
    GH: { name: "West Africa Time", abbreviation: "WAT" },
    UG: { name: "East Africa Time", abbreviation: "EAT" },
    RW: { name: "Central Africa Time", abbreviation: "CAT" },
    TZ: { name: "East Africa Time", abbreviation: "EAT" },
    ET: { name: "East Africa Time", abbreviation: "EAT" },
  };
  return timezones[countryCode || ""] || { name: "Local Time", abbreviation: "UTC" };
}

const BookAppointment = ({ user, onBooked }: BookAppointmentProps) => {
  const { geo } = useGeoLocation();
  const [patientCountry, setPatientCountry] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [hasUnpaidAppointments, setHasUnpaidAppointments] = useState(false);
  const [checkingUnpaid, setCheckingUnpaid] = useState(true);
  const { toast } = useToast();

  // Check for unpaid appointments - block booking if any exist
  useEffect(() => {
    setCheckingUnpaid(true);
    supabase
      .from("appointments")
      .select("id")
      .eq("patient_id", user.id)
      .eq("status", "awaiting_payment")
      .limit(1)
      .then(({ data }) => {
        setHasUnpaidAppointments((data?.length ?? 0) > 0);
        setCheckingUnpaid(false);
      });
  }, [user.id]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("profiles")
      .select("country")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setPatientCountry(data?.country ?? null);
      });
    return () => { cancelled = true; };
  }, [user.id]);

  useEffect(() => {
    supabase.from("specialties").select("*").then(({ data }) => {
      if (data) setSpecialties(data);
    });
  }, []);

  useEffect(() => {
    if (!selectedSpecialty) {
      setDoctors([]);
      return;
    }
    setLoadingDoctors(true);
    setSelectedDoctor("");
    supabase
      .from("doctors")
      .select("*, profile:profile_id(id, full_name, avatar_url, city, country), specialty:specialty_id(name)")
      .eq("specialty_id", selectedSpecialty)
      .eq("is_available", true)
      .then(({ data }) => {
        if (data) setDoctors(data);
        setLoadingDoctors(false);
      });
  }, [selectedSpecialty]);

  // Fetch doctor availability when doctor is selected
  useEffect(() => {
    if (!selectedDoctor) {
      setAvailability([]);
      setSelectedDate(undefined);
      setTime("");
      return;
    }
    setLoadingAvailability(true);
    setSelectedDate(undefined);
    setTime("");
    supabase
      .from("doctor_availability")
      .select("day_of_week, start_time, end_time, is_available, slot_duration_minutes")
      .eq("doctor_id", selectedDoctor)
      .eq("is_available", true)
      .then(({ data }) => {
        setAvailability((data as AvailabilitySlot[]) || []);
        setLoadingAvailability(false);
      });
  }, [selectedDoctor]);

  // Available days of week (0=Sun in date-fns, but doctor_availability uses 0=Sun too)
  const availableDaysOfWeek = useMemo(() => {
    return new Set(availability.map(a => a.day_of_week));
  }, [availability]);

  // Disable dates that are in the past or not on available days
  const isDateDisabled = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return true;
    const dow = getDay(date); // 0=Sun
    return !availableDaysOfWeek.has(dow);
  };

  // Generate time slots for selected date
  const timeSlots = useMemo(() => {
    if (!selectedDate || availability.length === 0) return [];
    const dow = getDay(selectedDate);
    const daySlots = availability.filter(a => a.day_of_week === dow);
    const slots: string[] = [];
    for (const s of daySlots) {
      const duration = s.slot_duration_minutes ?? 30;
      slots.push(...generateTimeSlots(s.start_time, s.end_time, duration));
    }
    
    // Filter out passed times if selected date is today
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    if (isToday) {
      return [...new Set(slots)]
        .sort()
        .filter(slot => {
          const [h, m] = slot.split(":").map(Number);
          const slotTime = new Date(selectedDate);
          slotTime.setHours(h, m, 0, 0);
          return slotTime > now;
        });
    }
    
    return [...new Set(slots)].sort();
  }, [selectedDate, availability]);

  const countries = [...new Set(doctors.map(d => d.profile?.country).filter(Boolean))].sort();
  const cities = [...new Set(doctors.map(d => d.profile?.city).filter(Boolean))].sort();

  const filteredDoctors = doctors.filter(d => {
    const name = d.profile?.full_name?.toLowerCase() || "";
    const matchSearch = !searchQuery || name.includes(searchQuery.toLowerCase()) || d.specialty?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCountry = !countryFilter || d.profile?.country === countryFilter;
    const matchCity = !cityFilter || d.profile?.city === cityFilter;
    return matchSearch && matchCountry && matchCity;
  });

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedDate || !time) {
      toast({ variant: "destructive", title: "Please fill all required fields" });
      return;
    }

    const selectedDoc = doctors.find(d => d.profile_id === selectedDoctor);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const scheduledAt = new Date(`${dateStr}T${time}`).toISOString();

    setLoading(true);

    const fee = selectedDoc?.consultation_fee ? Number(selectedDoc.consultation_fee) : 0;
    const needsPayment = fee > 0;

    const { data: apptData, error } = await supabase.from("appointments").insert({
      patient_id: user.id,
      doctor_id: selectedDoctor,
      scheduled_at: scheduledAt,
      duration_minutes: 30,
      reason: reason.trim() || null,
      status: needsPayment ? "awaiting_payment" : "pending",
    }).select("id").single();

    if (error) {
      setLoading(false);
      toast({ variant: "destructive", title: "Booking failed", description: error.message });
      return;
    }

    if (needsPayment) {
      const { data: configData } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "paystack_config")
        .maybeSingle();

      const payConfig = configData?.value as Record<string, unknown> | null;
      const timing = (payConfig?.payment_timing as string) || "at_booking";

      if (timing === "at_booking") {
        const currency = geo?.currency || "NGN";
        const callbackUrl = `${window.location.origin}/dashboard`;

        try {
          const { data: payData, error: payError } = await supabase.functions.invoke(
            "paystack-payment",
            {
              body: {
                action: "initialize",
                appointment_id: apptData.id,
                amount: fee,
                currency,
                email: user.email,
                doctor_id: selectedDoctor,
                callback_url: callbackUrl,
              },
            }
          );

          if (payError || payData?.error) {
            setLoading(false);
            toast({
              variant: "destructive",
              title: "Payment initialization failed",
              description: payData?.error || payError?.message || "Could not start payment",
            });
            return;
          }

          if (payData?.authorization_url) {
            toast({ title: "Redirecting to payment..." });
            window.location.href = payData.authorization_url;
            return;
          }
        } catch (err: any) {
          setLoading(false);
          toast({
            variant: "destructive",
            title: "Payment error",
            description: err.message || "An unexpected error occurred",
          });
          return;
        }
      }
    }

    setLoading(false);
    toast({ title: "Appointment booked!", description: `With ${selectedDoc?.profile?.full_name || "doctor"} on ${dateStr}` });
    setSelectedDoctor("");
    setSelectedDate(undefined);
    setTime("");
    setReason("");
    onBooked?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Calendar className="h-5 w-5 text-primary" /> Book Appointment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleBook} className="space-y-5">
          {/* Step 1: Specialty */}
          <div className="space-y-2">
            <Label>1. Choose Specialty</Label>
            <Select value={selectedSpecialty} onValueChange={(v) => { setSelectedSpecialty(v); setSelectedDoctor(""); setSearchQuery(""); setCountryFilter(""); setCityFilter(""); }}>
              <SelectTrigger><SelectValue placeholder="Select a specialty" /></SelectTrigger>
              <SelectContent>
                {specialties.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Doctor selection with filters */}
          {selectedSpecialty && (
            <div className="space-y-3">
              <Label>2. Select a Doctor</Label>

              {loadingDoctors ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : doctors.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No available doctors for this specialty.</p>
              ) : (
                <>
                  {/* Search & Filters */}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {countries.length > 1 && (
                      <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v === "all" ? "" : v); setCityFilter(""); }}>
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="Country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Countries</SelectItem>
                          {countries.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {cities.length > 1 && (
                      <Select value={cityFilter} onValueChange={(v) => setCityFilter(v === "all" ? "" : v)}>
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="City" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Cities</SelectItem>
                          {cities.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Doctor cards */}
                  <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                    {filteredDoctors.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">No doctors match your filters.</p>
                    ) : (
                      filteredDoctors.map(doc => {
                        const name = doc.profile?.full_name || "Doctor";
                        const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                        const isSelected = selectedDoctor === doc.profile_id;
                        const feeSymbol = getCurrencySymbol(
                          doc.profile?.country || patientCountry || geo?.countryCode || geo?.countryName
                        );
                        return (
                          <div
                            key={doc.profile_id}
                            onClick={() => setSelectedDoctor(doc.profile_id)}
                            className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:border-primary/40 hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {doc.profile?.avatar_url ? (
                                <img src={doc.profile.avatar_url} alt={name} className="h-10 w-10 rounded-full object-cover ring-1 ring-border" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 ring-1 ring-border">
                                  <span className="text-xs font-bold text-primary">{initials}</span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground truncate">{doc.title || "Dr."} {name}</p>
                                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {doc.profile?.city && (
                                    <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {doc.profile.city}{doc.profile.country ? `, ${doc.profile.country}` : ""}</span>
                                  )}
                                  {(doc.rating ?? 0) > 0 && (
                                    <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-warning text-warning" /> {Number(doc.rating).toFixed(1)} ({doc.total_reviews ?? 0})</span>
                                  )}
                                  {doc.consultation_fee != null && (
                                    <span className="flex items-center gap-0.5"><Coins className="h-3 w-3" /> {feeSymbol}{Number(doc.consultation_fee).toFixed(0)}</span>
                                  )}
                                  {(doc.experience_years ?? 0) > 0 && (
                                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {doc.experience_years} yrs</span>
                                  )}
                                </div>
                                {doc.bio && <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{doc.bio}</p>}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-2 pt-2 border-t border-border">
                                <Link to={`/doctors/${doc.profile_id}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                                  View full profile <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Date & Time — availability-aware */}
          {selectedDoctor && (
            <>
              {loadingAvailability ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Loading availability...</span>
                </div>
              ) : availability.length === 0 ? (
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                  <p className="text-sm text-muted-foreground">This doctor hasn't set their availability yet. Please choose a different doctor or try again later.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Label>3. Pick a Date & Time</Label>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {/* Calendar */}
                    <div className="rounded-lg border border-border p-1">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => { setSelectedDate(d); setTime(""); }}
                        disabled={isDateDisabled}
                        fromDate={new Date()}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </div>

                    {/* Time slots */}
                    <div className="flex-1 space-y-2">
                      {selectedDate ? (
                        <>
                          <p className="text-sm font-medium text-foreground">
                            Available slots for <span className="text-primary">{format(selectedDate, "EEE, MMM d")}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            All times in {getTimezoneFromCountry(selectedDoctor ? doctors.find(d => d.profile_id === selectedDoctor)?.profile?.country : null)?.abbreviation || "local"}
                          </p>
                          {timeSlots.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No time slots available for this day.</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto">
                              {timeSlots.map((slot, idx) => {
                                const isFirst = idx === 0;
                                const [h] = slot.split(":").map(Number);
                                const isPopular = h >= 16; // 4 PM onwards
                                
                                return (
                                  <div key={slot} className="relative">
                                    <Button
                                      type="button"
                                      variant={time === slot ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setTime(slot)}
                                      className={cn(
                                        "text-xs w-full",
                                        time === slot && "ring-2 ring-primary ring-offset-1"
                                      )}
                                    >
                                      {formatSlotTime(slot)}
                                    </Button>
                                    {isFirst && (
                                      <div className="absolute -top-2 -right-1 bg-primary text-primary-foreground text-xs font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                        Next
                                      </div>
                                    )}
                                    {isPopular && !isFirst && (
                                      <div className="absolute -top-2 -right-1 bg-warning text-warning-foreground text-xs font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                        Popular
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border p-6">
                          <p className="text-sm text-muted-foreground text-center">
                            ← Select a highlighted date to see available time slots
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Reason & Submit — only show when date+time selected */}
              {selectedDate && time && (
                <>
                  <div className="space-y-2">
                    <Label>Reason for Visit</Label>
                    <SuggestionChips
                      suggestions={COMMON_REASONS}
                      onSelect={(v) => setReason((prev) => {
                        if (prev.toLowerCase().includes(v.toLowerCase())) return prev;
                        return prev ? `${prev}, ${v}` : v;
                      })}
                      activeValues={reason.split(",").map(s => s.trim()).filter(Boolean)}
                      label="Quick select a common reason"
                    />
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Or describe your symptoms..." maxLength={500} />
                  </div>
                  <Button type="submit" disabled={loading} className="gap-2 gradient-primary border-0 text-primary-foreground">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                    Book Appointment
                  </Button>
                </>
              )}
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default BookAppointment;
