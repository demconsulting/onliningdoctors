import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getCountries, getStates, getCities } from "@/data/locations";

interface LocationSelectProps {
  country: string;
  state: string;
  city: string;
  onCountryChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
}

const LocationSelect = ({
  country,
  state,
  city,
  onCountryChange,
  onStateChange,
  onCityChange,
}: LocationSelectProps) => {
  const countries = getCountries();
  const states = getStates(country);
  const cities = getCities(country, state);

  // Reset dependent fields when parent changes
  useEffect(() => {
    if (country && states.length > 0 && state && !states.includes(state)) {
      onStateChange("");
      onCityChange("");
    }
  }, [country]);

  useEffect(() => {
    if (state && cities.length > 0 && city && !cities.includes(city)) {
      onCityChange("");
    }
  }, [state]);

  return (
    <>
      <div className="space-y-2">
        <Label>Country</Label>
        <Select value={country} onValueChange={(v) => { onCountryChange(v); onStateChange(""); onCityChange(""); }}>
          <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Province / State</Label>
        {states.length > 0 ? (
          <Select value={state} onValueChange={(v) => { onStateChange(v); onCityChange(""); }} disabled={!country}>
            <SelectTrigger><SelectValue placeholder="Select province/state" /></SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={state}
            onChange={(e) => onStateChange(e.target.value)}
            placeholder="Enter province/state"
            disabled={!country}
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>City / Suburb</Label>
        {cities.length > 0 ? (
          <Select value={city} onValueChange={onCityChange} disabled={!state}>
            <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="Enter city/suburb"
            disabled={!state}
          />
        )}
      </div>
    </>
  );
};

export default LocationSelect;
