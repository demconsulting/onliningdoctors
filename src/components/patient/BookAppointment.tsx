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
import { Calendar, Loader2, Star, MapPin, ExternalLink, DollarSign, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import SuggestionChips from "@/components/shared/SuggestionChips";
import { useGeoLocation } from "@/hooks/useGeoLocation";

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
  const currencySymbol = geo?.currencySymbol || "";
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
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

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !date || !time) {
      toast({ variant: "destructive", title: "Please fill all required fields" });
      return;
    }

    const doctor = doctors.find(d => d.profile_id === selectedDoctor);
    const scheduledAt = new Date(`${date}T${time}`).toISOString();

    setLoading(true);
    const { error } = await supabase.from("appointments").insert({
      patient_id: user.id,
      doctor_id: selectedDoctor,
      scheduled_at: scheduledAt,
      duration_minutes: 30,
      reason: reason.trim() || null,
      status: "pending",
    });
    setLoading(false);

    if (error) {
      toast({ variant: "destructive", title: "Booking failed", description: error.message });
    } else {
      toast({ title: "Appointment booked!", description: `With ${doctor?.profile?.full_name || "doctor"} on ${date}` });
      setSelectedDoctor("");
      setDate("");
      setTime("");
      setReason("");
      onBooked?.();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Calendar className="h-5 w-5 text-primary" /> Book Appointment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleBook} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Specialty</Label>
              <Select value={selectedSpecialty} onValueChange={(v) => { setSelectedSpecialty(v); setSelectedDoctor(""); }}>
                <SelectTrigger><SelectValue placeholder="Choose specialty" /></SelectTrigger>
                <SelectContent>
                  {specialties.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor} disabled={!selectedSpecialty || loadingDoctors}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingDoctors ? "Loading..." : doctors.length === 0 ? "Select specialty first" : "Choose doctor"} />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(d => (
                    <SelectItem key={d.profile_id} value={d.profile_id}>
                      {d.profile?.full_name || "Doctor"} — {currencySymbol}{d.consultation_fee || "N/A"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          </div>

          {/* Doctor preview card */}
          {selectedDoctor && (() => {
            const doc = doctors.find(d => d.profile_id === selectedDoctor);
            if (!doc) return null;
            const name = doc.profile?.full_name || "Doctor";
            const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {doc.profile?.avatar_url ? (
                    <img src={doc.profile.avatar_url} alt={name} className="h-12 w-12 rounded-lg object-cover ring-2 ring-border" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 ring-2 ring-border">
                      <span className="text-sm font-bold text-primary">{initials}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{doc.title || "Dr."} {name}</p>
                      {doc.specialty?.name && <Badge variant="secondary" className="text-xs">{doc.specialty.name}</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {doc.profile?.city && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {doc.profile.city}{doc.profile.country ? `, ${doc.profile.country}` : ""}</span>
                      )}
                      {(doc.rating ?? 0) > 0 && (
                        <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" /> {Number(doc.rating).toFixed(1)} ({doc.total_reviews ?? 0})</span>
                      )}
                      {doc.consultation_fee != null && (
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {currencySymbol}{Number(doc.consultation_fee).toFixed(0)}</span>
                      )}
                      {(doc.experience_years ?? 0) > 0 && (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {doc.experience_years} yrs exp.</span>
                      )}
                    </div>
                    {doc.bio && <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{doc.bio}</p>}
                  </div>
                </div>
                <Link to={`/doctor/${selectedDoctor}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  View full profile <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            );
          })()}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date</Label>
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
        </form>
      </CardContent>
    </Card>
  );
};

export default BookAppointment;
