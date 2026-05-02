import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Clock, Video, User, ShieldCheck, MessageSquare } from "lucide-react";
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
  license_number: string | null;
  profile: { full_name: string | null; avatar_url: string | null; city: string | null; country: string | null } | null;
  specialty: { name: string; icon: string | null } | null;
}

const DoctorCardNew = ({ doctor }: { doctor: Doctor }) => {
  const name = doctor.profile?.full_name || "Doctor";
  const currencySymbol = getCurrencySymbol(doctor.profile?.country);
  const displayName = `${doctor.title ? `${doctor.title} ` : "Dr. "}${name}`;
  const isAvailable = doctor.is_available;

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/60">
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {doctor.profile?.avatar_url ? (
          <img
            src={doctor.profile.avatar_url}
            alt={displayName}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
            <User className="h-20 w-20 text-primary/25" />
          </div>
        )}
        {/* Availability badge overlay */}
        <div className="absolute top-3 left-3">
          {isAvailable ? (
            <Badge className="gap-1.5 border-0 bg-success text-success-foreground shadow-md">
              <span className="h-2 w-2 rounded-full bg-success-foreground animate-pulse" />
              Available Now
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5 border-0 shadow-md">
              <Clock className="h-3 w-3" />
              Scheduled Only
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-5 space-y-3">
        {/* Name & Rating */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold text-foreground truncate">{displayName}</h3>
            {doctor.specialty?.name && (
              <p className="text-sm font-medium text-primary">{doctor.specialty.name}</p>
            )}
          </div>
          {(doctor.total_reviews ?? 0) > 0 && (
            <div className="flex items-center gap-1 shrink-0 rounded-md bg-warning/10 px-2 py-1">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span className="text-sm font-bold text-warning">{Number(doctor.rating).toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-sm text-muted-foreground">
          {(doctor.experience_years ?? 0) > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{doctor.experience_years}+ years experience</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 shrink-0 text-secondary" />
            <span className="text-secondary font-medium">Responds in ~5 mins</span>
          </div>
          {doctor.license_number && (
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary/60" />
              <span className="text-xs text-muted-foreground/70">HPCSA: {doctor.license_number}</span>
            </div>
          )}
        </div>

        {/* Price */}
        {doctor.consultation_fee != null && (
          <div className="rounded-lg bg-accent/50 px-3 py-2 text-center">
            <span className="text-xs text-muted-foreground">Consultation from </span>
            <span className="text-lg font-bold text-foreground">{currencySymbol}{Number(doctor.consultation_fee).toFixed(0)}</span>
          </div>
        )}

        {/* Trust badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground border-border/60">
            <Video className="h-3 w-3" /> Video Only
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground border-border/60">
            <ShieldCheck className="h-3 w-3" /> POPIA Compliant
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <Button asChild className="flex-1 gradient-primary border-0 text-primary-foreground shadow-md shadow-primary/10" size="default">
            <Link to={`/doctors/${doctor.profile_id}`}>
              {isAvailable ? "Start Consultation" : "Book Appointment"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="default">
            <Link to={`/doctors/${doctor.profile_id}`}>View Profile</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DoctorCardNew;
export type { Doctor };
