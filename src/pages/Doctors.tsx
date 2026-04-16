import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MedicalDisclaimerBanner from "@/components/layout/MedicalDisclaimerBanner";
import DoctorsHero from "@/components/doctors/DoctorsHero";
import TrustStrip from "@/components/doctors/TrustStrip";
import DoctorsFilters from "@/components/doctors/DoctorsFilters";
import AvailableNowSection from "@/components/doctors/AvailableNowSection";
import DoctorCardNew from "@/components/doctors/DoctorCardNew";
import WhatsAppButton from "@/components/doctors/WhatsAppButton";
import type { Doctor } from "@/components/doctors/DoctorCardNew";
import { Loader2, Stethoscope } from "lucide-react";

interface Specialty {
  id: string;
  name: string;
  icon: string | null;
}

const Doctors = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [sortBy, setSortBy] = useState("availability");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [docRes, specRes] = await Promise.all([
        supabase
          .from("doctors")
          .select("*, profile:profile_id(full_name, avatar_url, city, country), specialty:specialty_id(name, icon)")
          .eq("is_verified", true)
          .eq("is_suspended", false)
          .order("rating", { ascending: false }),
        supabase.from("specialties").select("*").order("name"),
      ]);
      if (docRes.data) setDoctors(docRes.data as Doctor[]);
      if (specRes.data) setSpecialties(specRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const countries = useMemo(
    () => [...new Set(doctors.map((d) => d.profile?.country).filter(Boolean))].sort() as string[],
    [doctors]
  );

  const filtered = useMemo(() => {
    let result = doctors.filter((d) => {
      const name = d.profile?.full_name?.toLowerCase() || "";
      const matchesSearch = name.includes(search.toLowerCase()) || (d.specialty?.name?.toLowerCase().includes(search.toLowerCase()));
      const matchesSpecialty = selectedSpecialty === "all" || d.specialty?.name === specialties.find((s) => s.id === selectedSpecialty)?.name;
      const matchesCountry = selectedCountry === "all" || d.profile?.country === selectedCountry;
      const matchesAvailable = !availableOnly || d.is_available;
      return matchesSearch && matchesSpecialty && matchesCountry && matchesAvailable;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "availability":
          return (b.is_available ? 1 : 0) - (a.is_available ? 1 : 0);
        case "rating":
          return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        case "price_low":
          return (Number(a.consultation_fee) || 9999) - (Number(b.consultation_fee) || 9999);
        case "price_high":
          return (Number(b.consultation_fee) || 0) - (Number(a.consultation_fee) || 0);
        case "experience":
          return (b.experience_years || 0) - (a.experience_years || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [doctors, search, selectedSpecialty, selectedCountry, sortBy, availableOnly, specialties]);

  const availableNow = useMemo(() => filtered.filter((d) => d.is_available), [filtered]);
  const allOthers = useMemo(
    () => (availableOnly ? filtered : filtered.filter((d) => !d.is_available || !availableNow.slice(0, 3).includes(d))),
    [filtered, availableNow, availableOnly]
  );

  const scrollToListings = () => {
    document.getElementById("doctor-listings")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <MedicalDisclaimerBanner />

      <DoctorsHero
        onTalkNow={() => { setAvailableOnly(true); scrollToListings(); }}
        onBookScheduled={scrollToListings}
      />

      <TrustStrip />

      {/* Listings */}
      <section id="doctor-listings" className="container mx-auto flex-1 px-4 py-8">
        <DoctorsFilters
          search={search} onSearchChange={setSearch}
          selectedSpecialty={selectedSpecialty} onSpecialtyChange={setSelectedSpecialty}
          selectedCountry={selectedCountry} onCountryChange={setSelectedCountry}
          sortBy={sortBy} onSortChange={setSortBy}
          availableOnly={availableOnly} onAvailableOnlyChange={setAvailableOnly}
          specialties={specialties} countries={countries}
        />

        <div className="mt-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Stethoscope className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-lg font-medium text-foreground">No doctors found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              {!availableOnly && <AvailableNowSection doctors={availableNow} />}

              <p className="mb-5 text-sm text-muted-foreground">
                {filtered.length} doctor{filtered.length !== 1 ? "s" : ""} found
              </p>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {allOthers.map((doc) => (
                  <DoctorCardNew key={doc.id} doctor={doc} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Doctors;
