import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

import { Calendar, Loader2, Star, MapPin, ExternalLink, Coins, Clock, Search, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import SuggestionChips from "@/components/shared/SuggestionChips";
import ConsentCheckboxes from "@/components/patient/ConsentCheckboxes";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getCurrencySymbol, COUNTRY_CURRENCY } from "@/lib/currency";
import { format, getDay, isBefore, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import MedicalAidPanel, { type ActiveMedicalAidRequest } from "@/components/patient/MedicalAidPanel";

interface BookAppointmentProps {
  user: User;
  onBooked?: () => void;
  preselectDoctorId?: string | null;
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

const BookAppointment = ({ user, onBooked, preselectDoctorId }: BookAppointmentProps) => {
  const { geo } = useGeoLocation();
  const [patientCountry, setPatientCountry] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [dependents, setDependents] = useState<any[]>([]);
  const [forWhom, setForWhom] = useState<string>("self"); // "self" or dependent id
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [paymentMethodType, setPaymentMethodType] = useState<"card" | "medical_aid">("card");
  const [doctorTiers, setDoctorTiers] = useState<any[]>([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [hasUnpaidAppointments, setHasUnpaidAppointments] = useState(false);
  const [checkingUnpaid, setCheckingUnpaid] = useState(true);
  const [consentGranted, setConsentGranted] = useState(false);
  const { toast } = useToast();

  // Load dependents
  useEffect(() => {
    supabase.from("dependents").select("id, full_name, relationship").eq("guardian_id", user.id).then(({ data }) => {
      if (data) setDependents(data);
    });
  }, [user.id]);

  const handleConsentChange = useCallback((granted: boolean) => {
    setConsentGranted(granted);
  }, []);

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

  // Preselect doctor from query param: load their specialty, which will load doctors list
  useEffect(() => {
    if (!preselectDoctorId) return;
    let cancelled = false;
    supabase
      .from("doctors")
      .select("specialty_id")
      .eq("profile_id", preselectDoctorId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.specialty_id) return;
        setSelectedSpecialty(data.specialty_id);
      });
    return () => { cancelled = true; };
  }, [preselectDoctorId]);

  // Once doctors load and preselect is requested, select that doctor
  useEffect(() => {
    if (!preselectDoctorId || doctors.length === 0) return;
    if (doctors.some(d => d.profile_id === preselectDoctorId)) {
      setSelectedDoctor(preselectDoctorId);
    }
  }, [preselectDoctorId, doctors]);

  useEffect(() => {
    if (!selectedSpecialty) {
      setDoctors([]);
      return;
    }
    setLoadingDoctors(true);
    setSelectedDoctor("");
    supabase
      .from("doctors")
      .select("*, profile:profile_id(id, full_name, avatar_url, city, country), specialty:specialty_id(name), consultation_category:consultation_category_id(id, name, description, min_price, max_price)")
      .eq("specialty_id", selectedSpecialty)
      .eq("is_available", true)
      .eq("is_suspended", false)
      .then(({ data }) => {
        if (data) setDoctors(data);
        setLoadingDoctors(false);
      });
  }, [selectedSpecialty]);

  // Fetch doctor availability when doctor is selected
  const [blockedTimes, setBlockedTimes] = useState<Array<{ start_time: string; end_time: string }>>([]);
  useEffect(() => {
    if (!selectedDoctor) {
      setAvailability([]);
      setBlockedTimes([]);
      setSelectedDate(undefined);
      setTime("");
      return;
    }
    setLoadingAvailability(true);
    setSelectedDate(undefined);
    setTime("");
    Promise.all([
      supabase
        .from("doctor_availability")
        .select("day_of_week, start_time, end_time, is_available, slot_duration_minutes")
        .eq("doctor_id", selectedDoctor)
        .eq("is_available", true),
      supabase
        .from("doctor_blocked_times")
        .select("start_time, end_time")
        .eq("doctor_id", selectedDoctor)
        .gte("end_time", new Date().toISOString()),
    ]).then(([{ data: avail }, { data: blocks }]) => {
      setAvailability((avail as AvailabilitySlot[]) || []);
      setBlockedTimes(blocks || []);
      setLoadingAvailability(false);
    });
  }, [selectedDoctor]);

  // Load doctor's pricing tiers when doctor is selected
  useEffect(() => {
    if (!selectedDoctor) { setDoctorTiers([]); return; }
    supabase.from("doctor_pricing_tiers").select("*").eq("doctor_id", selectedDoctor).eq("is_active", true)
      .then(({ data }) => setDoctorTiers(data || []));
    setPaymentMethodType("card");
  }, [selectedDoctor]);

  const [activeMedicalAid, setActiveMedicalAid] = useState<ActiveMedicalAidRequest | null>(null);
  // Reset medical-aid state when doctor or method changes
  useEffect(() => { setActiveMedicalAid(null); }, [selectedDoctor, paymentMethodType]);

  const activeTier = useMemo(() => {
    if (paymentMethodType === "medical_aid") {
      return doctorTiers.find((t: any) => t.tier_type === "medical_aid")
        || doctorTiers.find((t: any) => t.tier_type === "private");
    }
    return doctorTiers.find((t: any) => t.tier_type === "private") || doctorTiers[0];
  }, [doctorTiers, paymentMethodType]);

  const hasMedicalAidTier = doctorTiers.some((t: any) => t.tier_type === "medical_aid");

  // Available days of week (0=Sun in date-fns, but doctor_availability uses 0=Sun too)
  const availableDaysOfWeek = useMemo(() => {
    return new Set(availability.map(a => a.day_of_week));
  }, [availability]);

  // Auto-select today's date if doctor is available today; otherwise next available day
  useEffect(() => {
    if (availability.length === 0 || selectedDate) return;
    const today = startOfDay(new Date());
    for (let i = 0; i < 14; i++) {
      const candidate = new Date(today);
      candidate.setDate(today.getDate() + i);
      if (availableDaysOfWeek.has(getDay(candidate))) {
        setSelectedDate(candidate);
        return;
      }
    }
  }, [availability, availableDaysOfWeek, selectedDate]);

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

    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);
    const dayBlocks = blockedTimes
      .map((b) => ({ s: new Date(b.start_time), e: new Date(b.end_time) }))
      .filter((b) => b.s <= dayEnd && b.e >= dayStart);

    return [...new Set(slots)]
      .sort()
      .filter((slot) => {
        const [h, m] = slot.split(":").map(Number);
        const slotTime = new Date(selectedDate);
        slotTime.setHours(h, m, 0, 0);
        if (isToday && slotTime <= now) return false;
        const slotEnd = new Date(slotTime.getTime() + 30 * 60000);
        return !dayBlocks.some((b) => slotTime < b.e && slotEnd > b.s);
      });
  }, [selectedDate, availability, blockedTimes]);

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
    if (!selectedDoctor || !selectedDate || !time || !consentGranted) {
      toast({ variant: "destructive", title: "Please fill all required fields and provide consent" });
      return;
    }

    // Store consent if needed
    if ((window as any).__storePatientConsent) {
      await (window as any).__storePatientConsent();
    }

    const selectedDoc = doctors.find(d => d.profile_id === selectedDoctor);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const scheduledAt = new Date(`${dateStr}T${time}`).toISOString();

    setLoading(true);

    const isMedicalAid = paymentMethodType === "medical_aid";
    const cardTier = doctorTiers.find((t: any) => t.tier_type === "private") || doctorTiers[0];
    // Source of truth for what the patient pays = the doctor's listed consultation_fee shown in the UI.
    // Fall back to the private pricing tier only if the doctor has no listed fee.
    const fee = isMedicalAid
      ? Number(activeMedicalAid?.copayment_amount ?? activeMedicalAid?.approved_rate ?? 0)
      : (selectedDoc?.consultation_fee != null
          ? Number(selectedDoc.consultation_fee)
          : (cardTier ? Number(cardTier.price) : 0));
    const tierType = isMedicalAid ? "medical_aid" : "private";
    // For medical aid: only collect co-payment now; full consult settled separately by scheme
    const needsPayment = fee > 0;

    const { data: apptData, error } = await supabase.from("appointments").insert({
      patient_id: user.id,
      doctor_id: selectedDoctor,
      dependent_id: forWhom === "self" ? null : forWhom,
      scheduled_at: scheduledAt,
      duration_minutes: cardTier?.duration_minutes || 30,
      reason: reason.trim() || null,
      status: needsPayment ? "awaiting_payment" : "pending",
      payment_method_type: paymentMethodType,
      pricing_tier_type: tierType,
      pricing_tier_id: isMedicalAid ? null : (cardTier?.id || null),
      medical_aid_request_id: isMedicalAid ? activeMedicalAid?.id || null : null,
    } as any).select("id").single();

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
        // Derive currency from the doctor's registered country
        const doctorCountry = selectedDoc?.profile?.country || "";
        const countryNameToCode: Record<string, string> = {
          "South Africa": "ZA", "Nigeria": "NG", "Kenya": "KE", "Ghana": "GH",
          "Tanzania": "TZ", "Uganda": "UG", "Egypt": "EG", "Ethiopia": "ET",
          "Rwanda": "RW", "United States": "US", "United Kingdom": "GB", "India": "IN",
          "Botswana": "BW", "Zimbabwe": "ZW", "Mozambique": "MZ", "Namibia": "NA",
          "Angola": "AO", "Democratic Republic of the Congo": "CD", "Cameroon": "CM",
          "Ivory Coast": "CI", "Senegal": "SN", "Mali": "ML", "Madagascar": "MG",
          "Malawi": "MW", "Zambia": "ZM", "Canada": "CA", "Australia": "AU",
          "Germany": "DE", "France": "FR",
        };
        const dCode = doctorCountry.length === 2
          ? doctorCountry.toUpperCase()
          : countryNameToCode[doctorCountry] || null;
        const currency = (dCode && COUNTRY_CURRENCY[dCode]?.currency) || "NGN";
        const callbackUrl = `${window.location.origin}/dashboard`;

        try {
          const { data: payData, error: payError } = await supabase.functions.invoke(
            "paystack-payment",
            {
              body: {
                action: "initialize",
                appointment_id: apptData.id,
                currency,
                email: user.email,
                doctor_id: selectedDoctor,
                callback_url: callbackUrl,
                consultation_type: tierType,
                payment_method: paymentMethodType,
                medical_aid_request_id: isMedicalAid ? activeMedicalAid?.id || null : null,
                transaction_type: paymentMethodType === "medical_aid" ? "medical_aid_consultation" : "card_consultation",
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

    // Send confirmation emails (free / no-payment bookings)
    supabase.functions.invoke("send-booking-email", {
      body: { appointment_id: apptData.id, kind: "booking_confirmation" },
    }).catch((err) => console.error("Email send failed:", err));

    setLoading(false);
    toast({ title: "Appointment booked!", description: `With ${selectedDoc?.profile?.full_name || "doctor"} on ${dateStr}` });
    setSelectedDoctor("");
    setSelectedDate(undefined);
    setTime("");
    setReason("");
    onBooked?.();
  };

  if (checkingUnpaid) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const cancelUnpaidAppointments = async () => {
    setLoading(true);
    try {
      const { data: unpaid } = await supabase
        .from("appointments")
        .select("id")
        .eq("patient_id", user.id)
        .eq("status", "awaiting_payment");

      if (unpaid && unpaid.length > 0) {
        for (const appt of unpaid) {
          await supabase
            .from("appointments")
            .update({ status: "cancelled", cancellation_reason: "Incomplete booking cancelled by patient" })
            .eq("id", appt.id);
        }
      }
      setHasUnpaidAppointments(false);
      toast({ title: "Incomplete bookings cancelled", description: "You can now start a new booking." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (hasUnpaidAppointments) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Calendar className="h-5 w-5 text-primary" /> Book Appointment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Coins className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Incomplete Booking Found</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              You have an incomplete booking awaiting payment. Cancel it to start a new booking, or complete the payment.
            </p>
            <Button onClick={cancelUnpaidAppointments} disabled={loading} variant="destructive">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cancel & Start Over
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Calendar className="h-5 w-5 text-primary" /> Book Appointment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleBook} className="space-y-5">
          {/* Step 0: Who is this for? */}
          <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
            <Label>Who is this consultation for? *</Label>
            <Select value={forWhom} onValueChange={setForWhom}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Myself</SelectItem>
                {dependents.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.full_name} ({d.relationship})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dependents.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Want to book for a family member? Add them in the <strong>Family</strong> tab first.
              </p>
            )}
          </div>

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
                        const docCountry = doc.profile?.country || "";
                        const feeSymbol = getCurrencySymbol(docCountry || patientCountry || geo?.countryCode || geo?.countryName);
                        const docCountryNameToCode: Record<string, string> = {
                          "South Africa": "ZA", "Nigeria": "NG", "Kenya": "KE", "Ghana": "GH",
                          "Tanzania": "TZ", "Uganda": "UG", "Egypt": "EG", "Ethiopia": "ET",
                          "Rwanda": "RW", "United States": "US", "United Kingdom": "GB", "India": "IN",
                          "Botswana": "BW", "Zimbabwe": "ZW", "Mozambique": "MZ", "Namibia": "NA",
                          "Angola": "AO", "Democratic Republic of the Congo": "CD", "Cameroon": "CM",
                          "Ivory Coast": "CI", "Senegal": "SN", "Mali": "ML", "Madagascar": "MG",
                          "Malawi": "MW", "Zambia": "ZM", "Canada": "CA", "Australia": "AU",
                          "Germany": "DE", "France": "FR",
                        };
                        const dCountryCode = docCountry.length === 2 ? docCountry.toUpperCase() : docCountryNameToCode[docCountry] || null;
                        const feeCurrencyCode = (dCountryCode && COUNTRY_CURRENCY[dCountryCode]?.currency) || "";
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
                                      <span className="flex items-center gap-0.5"><Coins className="h-3 w-3" /> {feeSymbol}{Number(doc.consultation_fee).toFixed(0)}{feeCurrencyCode ? ` ${feeCurrencyCode}` : ""}</span>
                                    )}
                                    {(doc as any).consultation_category?.name && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{(doc as any).consultation_category.name}</Badge>
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
              {/* Payment Method (patient-facing — no internal fee breakdown) */}
              {(() => {
                const selectedDoc = doctors.find(d => d.profile_id === selectedDoctor);
                const docCountry = selectedDoc?.profile?.country || "";
                const feeSymbol = getCurrencySymbol(docCountry || patientCountry || geo?.countryCode || geo?.countryName);
                const cardFee = selectedDoc?.consultation_fee
                  ?? (doctorTiers.find((t: any) => t.tier_type === "private") || doctorTiers[0])?.price
                  ?? 0;
                const maidFee = activeMedicalAid?.approved_rate ?? null;
                const maidCopay = activeMedicalAid?.copayment_amount ?? null;
                return (
                  <div className="space-y-3">
                    <Label>Payment Method *</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button type="button" onClick={() => setPaymentMethodType("card")}
                        className={cn("text-left rounded-lg border p-3 transition-colors", paymentMethodType === "card" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/40")}>
                        <p className="font-semibold text-sm">Card Payment</p>
                        <p className="text-xs text-muted-foreground">Pay now with card. Instant confirmation.</p>
                      </button>
                      <button type="button" onClick={() => setPaymentMethodType("medical_aid")}
                        className={cn("text-left rounded-lg border p-3 transition-colors", paymentMethodType === "medical_aid" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/40")}>
                        <p className="font-semibold text-sm">Medical Aid</p>
                        <p className="text-xs text-muted-foreground">Submit your medical aid details for approval and scheduling.</p>
                      </button>
                    </div>

                    {paymentMethodType === "card" && Number(cardFee) > 0 && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm flex items-center justify-between">
                        <span className="text-muted-foreground">Consultation Fee</span>
                        <span className="font-semibold text-foreground">{feeSymbol}{Number(cardFee).toFixed(2)}</span>
                      </div>
                    )}

                    {paymentMethodType === "medical_aid" && (
                      <MedicalAidPanel
                        patientId={user.id}
                        doctorId={selectedDoctor}
                        currencySymbol={feeSymbol}
                        onActiveRequestChange={setActiveMedicalAid}
                      />
                    )}

                    {paymentMethodType === "medical_aid" && activeMedicalAid && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Consultation Fee</span>
                          <span className="font-semibold text-foreground">{feeSymbol}{Number(maidFee || 0).toFixed(2)}</span>
                        </div>
                        {maidCopay != null && Number(maidCopay) > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Co-payment due</span>
                            <span className="font-medium">{feeSymbol}{Number(maidCopay).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}


              {paymentMethodType === "medical_aid" && !activeMedicalAid ? null : loadingAvailability ? (
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
                  <ConsentCheckboxes userId={user.id} onConsentGiven={handleConsentChange} />
                  <Button type="submit" disabled={loading || !consentGranted} className="gap-2 gradient-primary border-0 text-primary-foreground">
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
