import { useEffect, useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCountries, getStates, getCities } from "@/data/locations";

interface LocationSelectProps {
  country: string;
  state: string;
  city: string;
  onCountryChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

const SearchableSelect = ({ label, value, options, onChange, placeholder, disabled }: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);

  if (options.length === 0) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === opt ? "opacity-100" : "opacity-0")} />
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

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
      <SearchableSelect
        label="Country"
        value={country}
        options={countries}
        onChange={onCountryChange}
        placeholder="Select country"
      />
      <SearchableSelect
        label="Province / State"
        value={state}
        options={states}
        onChange={onStateChange}
        placeholder={states.length > 0 ? "Select province/state" : "Enter province/state"}
        disabled={!country}
      />
      <SearchableSelect
        label="City / Suburb"
        value={city}
        options={cities}
        onChange={onCityChange}
        placeholder={cities.length > 0 ? "Select city/suburb" : "Enter city/suburb"}
        disabled={!state}
      />
    </>
  );
};

export default LocationSelect;
