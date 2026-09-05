import { Search, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Specialty {
  id: string;
  name: string;
  icon: string | null;
}

interface DoctorsFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  selectedSpecialty: string;
  onSpecialtyChange: (v: string) => void;
  locationQuery: string;
  onLocationChange: (v: string) => void;
  onLocationClear: () => void;
  sortBy: string;
  onSortChange: (v: string) => void;
  availableOnly: boolean;
  onAvailableOnlyChange: (v: boolean) => void;
  specialties: Specialty[];
}

const DoctorsFilters = ({
  search, onSearchChange,
  selectedSpecialty, onSpecialtyChange,
  locationQuery, onLocationChange, onLocationClear,
  sortBy, onSortChange,
  availableOnly, onAvailableOnlyChange,
  specialties,
}: DoctorsFiltersProps) => (
  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or specialty..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Specialty */}
      <Select value={selectedSpecialty} onValueChange={onSpecialtyChange}>
        <SelectTrigger className="w-full lg:w-44">
          <SelectValue placeholder="Specialty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Specialties</SelectItem>
          {specialties.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Location */}
      <div className="relative flex-1 lg:max-w-sm">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="City or suburb (e.g. Sandton, Rosebank)"
          value={locationQuery}
          onChange={(e) => onLocationChange(e.target.value)}
          className="pl-10 pr-9"
        />
        {locationQuery && (
          <button
            type="button"
            onClick={onLocationClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground focus:outline-none"
            aria-label="Clear location filter"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Sort */}
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-full lg:w-40">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="earliest">Earliest Available</SelectItem>
          <SelectItem value="rating">Rating</SelectItem>
          <SelectItem value="price_low">Fee: Lowest First</SelectItem>
          <SelectItem value="price_high">Fee: Highest First</SelectItem>
          <SelectItem value="experience">Experience</SelectItem>
        </SelectContent>
      </Select>

      {/* Available Now toggle */}
      <button
        onClick={() => onAvailableOnlyChange(!availableOnly)}
        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
          availableOnly
            ? "border-success/40 bg-success/10 text-success"
            : "border-border bg-background text-muted-foreground hover:bg-accent"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${availableOnly ? "bg-success animate-pulse" : "bg-muted-foreground/40"}`} />
        Available Now
      </button>
    </div>
  </div>
);

export default DoctorsFilters;
