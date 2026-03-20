import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrencySymbol } from "@/lib/currency";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ReviewList from "@/components/reviews/ReviewList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Star, Clock, DollarSign, Loader2, Stethoscope, MapPin,
  GraduationCap, Building2, Languages, CalendarPlus, ShieldCheck,
  FileText, ChevronLeft,
} from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DoctorData {
  id: string;
  profile_id: string;
  bio: string | null;
  consultation_fee: number | null;
  experience_years: number | null;
  rating: number | null;
  total_reviews: number | null;
  is_available: boolean | null;
  title: string | null;
  languages: string[] | null;
  hospital_affiliation: string | null;
  education: string | null;
  license_number: string | null;
  profile: { full_name: string | null; avatar_url: string | null; city: string | null; country: string | null } | null;
  specialty: { name: string; icon: string | null } | null;
}

interface Availability {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean | null;
}

interface PricingTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean | null;
}

const DoctorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [doctor, setDoctor] = useState<DoctorData | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const cs = doctor ? getCurrencySymbol(doctor.profile?.country) : "";

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const [docRes, availRes, tierRes] = await Promise.all([
        supabase
          .from("doctors")
          .select("*, profile:profile_id(full_name, avatar_url, city, country), specialty:specialty_id(name, icon)")
          .eq("profile_id", id)
          .single(),
        supabase
          .from("doctor_availability")
          .select("day_of_week, start_time, end_time, is_available")
          .eq("doctor_id", id)
          .order("day_of_week"),
        supabase
          .from("doctor_pricing_tiers")
          .select("*")
          .eq("doctor_id", id)
          .eq("is_active", true)
          .order("price"),
      ]);
      if (docRes.data) setDoctor(docRes.data as unknown as DoctorData);
      if (availRes.data) setAvailability(availRes.data);
      if (tierRes.data) setTiers(tierRes.data);
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Stethoscope className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-lg font-medium text-foreground">Doctor not found</p>
          <Link to="/doctors">
            <Button variant="outline" className="gap-2"><ChevronLeft className="h-4 w-4" /> Back to Doctors</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const name = doctor.profile?.full_name || "Doctor";
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const displayName = `${doctor.title || "Dr."} ${name}`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero banner */}
        <section className="border-b border-border bg-gradient-to-br from-background to-accent/40 py-10">
          <div className="container mx-auto px-4">
            <Link to="/doctors" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" /> All Doctors
            </Link>

            <div className="mt-4 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              {doctor.profile?.avatar_url ? (
                <img src={doctor.profile.avatar_url} alt={name} className="h-24 w-24 rounded-2xl object-cover ring-4 ring-border shadow-md" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-border shadow-md">
                  <span className="text-2xl font-bold text-primary">{initials}</span>
                </div>
              )}

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{displayName}</h1>
                  <Badge variant="outline" className={doctor.is_available ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}>
                    {doctor.is_available ? "Available" : "Unavailable"}
                  </Badge>
                </div>

                {doctor.specialty?.name && (
                  <p className="mt-1 text-sm font-medium text-primary">{doctor.specialty.name}</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {doctor.profile?.city && (
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {doctor.profile.city}{doctor.profile.country ? `, ${doctor.profile.country}` : ""}</span>
                  )}
                  {(doctor.rating ?? 0) > 0 && (
                    <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" /> <span className="font-medium text-foreground">{Number(doctor.rating).toFixed(1)}</span> ({doctor.total_reviews ?? 0} reviews)</span>
                  )}
                  {(doctor.experience_years ?? 0) > 0 && (
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {doctor.experience_years} years exp.</span>
                  )}
                </div>
              </div>

              <Link to="/dashboard">
                <Button size="lg" className="gap-2 gradient-primary border-0 text-primary-foreground shadow-lg">
                  <CalendarPlus className="h-5 w-5" /> Book Appointment
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="container mx-auto grid gap-6 px-4 py-10 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Bio */}
            {doctor.bio && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-base"><Stethoscope className="h-4 w-4 text-primary" /> About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{doctor.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Professional details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-base"><GraduationCap className="h-4 w-4 text-primary" /> Professional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {doctor.education && (
                  <div className="flex items-start gap-3">
                    <GraduationCap className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">Education</p><p className="text-sm font-medium text-foreground">{doctor.education}</p></div>
                  </div>
                )}
                {doctor.hospital_affiliation && (
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">Hospital Affiliation</p><p className="text-sm font-medium text-foreground">{doctor.hospital_affiliation}</p></div>
                  </div>
                )}
                {doctor.license_number && (
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-success" />
                    <div>
                      <p className="text-xs text-muted-foreground">Credentials</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm font-medium text-success flex items-center gap-1 cursor-help">
                              <ShieldCheck className="h-3.5 w-3.5" /> Verified by Platform
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            This doctor's medical license, qualifications, and professional credentials have been reviewed and verified by our team.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            {id && <ReviewList doctorId={id} />}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Availability */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-base"><Clock className="h-4 w-4 text-primary" /> Availability Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                {availability.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No schedule set yet.</p>
                ) : (
                  <div className="space-y-2">
                    {availability.filter(a => a.is_available !== false).map((slot, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                        <span className="font-medium text-foreground">{DAYS[slot.day_of_week]}</span>
                        <span className="text-muted-foreground">{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing Tiers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-base"><DollarSign className="h-4 w-4 text-primary" /> Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                {tiers.length === 0 ? (
                  <div>
                    {doctor.consultation_fee != null ? (
                      <p className="text-sm text-muted-foreground">Standard consultation: <span className="font-semibold text-foreground">{cs}{Number(doctor.consultation_fee).toFixed(0)}</span></p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No pricing info available.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tiers.map(tier => (
                      <div key={tier.id} className="rounded-lg border border-border p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">{tier.name}</span>
                          <span className="text-sm font-bold text-primary">{cs}{tier.price}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {tier.duration_minutes} min
                        </div>
                        {tier.description && <p className="text-xs text-muted-foreground">{tier.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Book CTA */}
            <Link to="/dashboard" className="block">
              <Button className="w-full gap-2 gradient-primary border-0 text-primary-foreground shadow-lg" size="lg">
                <CalendarPlus className="h-5 w-5" /> Book Appointment
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DoctorDetail;
