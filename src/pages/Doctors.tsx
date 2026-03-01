import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Clock, DollarSign, Loader2, Stethoscope, User } from "lucide-react";

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
  profile: { full_name: string | null; avatar_url: string | null; city: string | null } | null;
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
  const [loading, setLoading] = useState(true);
  const { geo } = useGeoLocation();

  useEffect(() => {
    const fetchData = async () => {
      const [docRes, specRes] = await Promise.all([
        supabase
          .from("doctors")
          .select("*, profile:profile_id(full_name, avatar_url, city), specialty:specialty_id(name, icon)")
          .order("rating", { ascending: false }),
        supabase.from("specialties").select("*").order("name"),
      ]);
      if (docRes.data) setDoctors(docRes.data as Doctor[]);
      if (specRes.data) setSpecialties(specRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = doctors.filter((d) => {
    const name = d.profile?.full_name?.toLowerCase() || "";
    const matchesSearch = name.includes(search.toLowerCase()) || (d.specialty?.name?.toLowerCase().includes(search.toLowerCase()));
    const matchesSpecialty = selectedSpecialty === "all" || d.specialty?.name === specialties.find(s => s.id === selectedSpecialty)?.name;
    return matchesSearch && matchesSpecialty;
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
                <DoctorCard key={doc.id} doctor={doc} currencySymbol={geo?.currencySymbol ?? "$"} />
              ))}
            </div>
          </>
        )}
      </section>

      <Footer />
    </div>
  );
};

const DoctorCard = ({ doctor, currencySymbol }: { doctor: Doctor; currencySymbol: string }) => {
  const name = doctor.profile?.full_name || "Doctor";
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Link to={`/doctors/${doctor.profile_id}`} className="block">
    <Card className="group overflow-hidden transition-shadow hover:shadow-lg cursor-pointer">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {doctor.profile?.avatar_url ? (
            <img
              src={doctor.profile.avatar_url}
              alt={name}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-2 ring-border">
              <span className="text-sm font-bold text-primary">{initials}</span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-display text-base font-semibold text-foreground">
                {doctor.title ? `${doctor.title} ` : "Dr. "}{name}
              </h3>
            </div>

            {doctor.specialty?.name && (
              <p className="mt-0.5 text-sm text-primary font-medium">{doctor.specialty.name}</p>
            )}

            {doctor.profile?.city && (
              <p className="mt-0.5 text-xs text-muted-foreground">{doctor.profile.city}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {(doctor.rating ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span className="font-medium text-foreground">{Number(doctor.rating).toFixed(1)}</span>
              {(doctor.total_reviews ?? 0) > 0 && (
                <span>({doctor.total_reviews})</span>
              )}
            </span>
          )}
          {(doctor.experience_years ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {doctor.experience_years} yrs
            </span>
          )}
          {doctor.consultation_fee != null && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              {currencySymbol}{Number(doctor.consultation_fee).toFixed(0)}
            </span>
          )}
        </div>

        {/* Bio */}
        {doctor.bio && (
          <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{doctor.bio}</p>
        )}

        {/* Languages + Availability */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {doctor.languages?.slice(0, 3).map((lang) => (
              <Badge key={lang} variant="secondary" className="text-[10px] px-1.5 py-0">
                {lang}
              </Badge>
            ))}
          </div>
          <Badge
            variant="outline"
            className={doctor.is_available
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive"
            }
          >
            {doctor.is_available ? "Available" : "Unavailable"}
          </Badge>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
};

export default Doctors;
