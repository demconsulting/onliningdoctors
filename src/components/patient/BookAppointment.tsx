import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, Star, MapPin, ExternalLink, DollarSign, Clock, Search, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import SuggestionChips from "@/components/shared/SuggestionChips";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getCurrencySymbol } from "@/lib/currency";

interface BookAppointmentProps {
  user: User;
  onBooked?: () => void;
}

const COMMON_REASONS = [
  "General check-up", "Flu / Cold symptoms", "Headache / Migraine",
  "Skin condition", "Stomach / Digestive issues", "Back / Joint pain",
  "Follow-up consultation", "Prescription refill", "Mental health concern",
  "Chronic disease management", "Lab results review", "Second opinion"
];

const BookAppointment = ({ user, onBooked }: BookAppointmentProps) => {
  const { geo } = useGeoLocation();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("specialties").select("*").then(({ data }) => {
      if (data) setSpecialties(data);
    });
  }, []);

  useEffect(() => {
    if (!selectedSpecialty) { setDoctors([]); return; }
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

  // Derive unique countries/cities for filters
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
    if (!selectedDoctor || !date || !time) {
      toast({ variant: "destructive", title: "Please fill all required fields" });
      return;
    }

    const selectedDoc = doctors.find(d => d.profile_id === selectedDoctor);
    const scheduledAt = new Date(`${date}T${time}`).toISOString();

    setLoading(true);

    // Determine fee upfront to decide initial status
    const fee = selectedDoc?.consultation_fee ? Number(selectedDoc.consultation_fee) : 0;
    const needsPayment = fee > 0;

    // 1. Create the appointment — awaiting_payment if fee required, pending otherwise
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

    // 2. Check payment config & doctor fee
    if (needsPayment) {
      // Load payment config to check timing
      const { data: configData } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "paystack_config")
        .maybeSingle();

      const payConfig = configData?.value as Record<string, unknown> | null;
      const timing = (payConfig?.payment_timing as string) || "at_booking";

      if (timing === "at_booking") {
        // Initialize Paystack payment
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

          // Redirect to Paystack checkout
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

    // If no fee or payment timing is not at_booking, just confirm
    setLoading(false);
    toast({ title: "Appointment booked!", description: `With ${selectedDoc?.profile?.full_name || "doctor"} on ${date}` });
    setSelectedDoctor("");
    setDate("");
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
                        const feeSymbol = getCurrencySymbol(doc.profile?.country || geo?.countryCode || geo?.countryName);

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
                                    <span className="flex items-center gap-0.5"><DollarSign className="h-3 w-3" /> {feeSymbol}{Number(doc.consultation_fee).toFixed(0)}</span>
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

          {/* Step 3: Date & Time */}
          {selectedDoctor && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>3. Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} required />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                </div>
              </div>
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
        </form>
      </CardContent>
    </Card>
  );
};

export default BookAppointment;
