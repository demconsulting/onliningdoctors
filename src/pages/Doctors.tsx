import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Clock, Calendar, Video, Loader2, Stethoscope, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrencySymbol } from "@/lib/currency";

interface Doctor {
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
  profile: { full_name: string | null; avatar_url: string | null; city: string | null; country: string | null } | null;
  specialty: { name: string; icon: string | null } | null;
}

interface Specialty {
  id: string;
  name: string;
  icon: string | null;
}

const Doctors = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [docRes, specRes] = await Promise.all([
        supabase
          .from("doctors")
          .select("*, profile:profile_id(full_name, avatar_url, city, country), specialty:specialty_id(name, icon)")
          .eq("is_verified", true)
          .eq("is_available", true)
          .order("rating", { ascending: false }),
        supabase.from("specialties").select("*").order("name"),
      ]);
      if (docRes.data) setDoctors(docRes.data as Doctor[]);
      if (specRes.data) setSpecialties(specRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const countries = [...new Set(doctors.map(d => d.profile?.country).filter(Boolean))].sort() as string[];

  const filtered = doctors.filter((d) => {
    const name = d.profile?.full_name?.toLowerCase() || "";
    const matchesSearch = name.includes(search.toLowerCase()) || (d.specialty?.name?.toLowerCase().includes(search.toLowerCase()));
    const matchesSpecialty = selectedSpecialty === "all" || d.specialty?.name === specialties.find(s => s.id === selectedSpecialty)?.name;
    const matchesCountry = selectedCountry === "all" || d.profile?.country === selectedCountry;
    return matchesSearch && matchesSpecialty && matchesCountry;
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-background to-accent/40 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">
            Find Your <span className="text-primary">Doctor</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Browse our network of qualified healthcare professionals and book your consultation today.
          </p>

          {/* Filters */}
          <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or specialty..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {countries.length > 0 && (
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </section>

      {/* Doctor Grid */}
      <section className="container mx-auto flex-1 px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Stethoscope className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground">No doctors found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <>
             <p className="mb-6 text-sm text-muted-foreground">{filtered.length} doctor{filtered.length !== 1 ? "s" : ""} found</p>
             <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
               {filtered.map((doc) => (
                 <DoctorCard key={doc.id} doctor={doc} />
               ))}
             </div>
          </>
        )}
      </section>

      <Footer />
    </div>
  );
};

const DoctorCard = ({ doctor }: { doctor: Doctor }) => {
  const name = doctor.profile?.full_name || "Doctor";
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const currencySymbol = getCurrencySymbol(doctor.profile?.country);
  const displayName = `${doctor.title ? `${doctor.title} ` : "Dr. "}${name}`;

  return (
    <Link to={`/doctors/${doctor.profile_id}`} className="block">
      <Card className="group overflow-hidden transition-all hover:shadow-xl cursor-pointer">
        {/* Large image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {doctor.profile?.avatar_url ? (
            <img
              src={doctor.profile.avatar_url}
              alt={displayName}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10">
              <User className="h-20 w-20 text-primary/30" />
            </div>
          )}
        </div>

        <CardContent className="p-5">
          {/* Name & reviews */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-bold text-foreground">{displayName}</h3>
            {(doctor.total_reviews ?? 0) > 0 ? (
              <Badge variant="outline" className="shrink-0 gap-1 border-warning/30 text-warning">
                <Star className="h-3 w-3 fill-warning" />
                {Number(doctor.rating).toFixed(1)}
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 text-muted-foreground">No reviews</Badge>
            )}
          </div>

          {/* Specialty */}
          {doctor.specialty?.name && (
            <p className="mt-1 text-sm font-medium text-primary">{doctor.specialty.name}</p>
          )}

          {/* Details */}
          <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {(doctor.experience_years ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{doctor.experience_years}+ years experience</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{doctor.is_available ? "Available Today" : "Currently Unavailable"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-secondary" />
              <span className="font-medium text-secondary">Online Consultation Available</span>
            </div>
            {doctor.consultation_fee != null && (
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                <span className="font-semibold text-foreground">{currencySymbol}{Number(doctor.consultation_fee).toFixed(0)}</span>
              </div>
            )}
          </div>

          {/* Book button */}
          <Button className="mt-4 w-full gradient-primary border-0 text-primary-foreground" size="lg">
            Book Appointment
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
};

export default Doctors;
