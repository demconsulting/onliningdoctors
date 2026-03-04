import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (value: string) => void;
  activeValues?: string[];
  label?: string;
}

const SuggestionChips = ({ suggestions, onSelect, activeValues = [], label }: SuggestionChipsProps) => {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => {
          const isActive = activeValues.some(
            (v) => v.toLowerCase() === s.toLowerCase()
          );
          return (
            <Badge
              key={s}
              variant={isActive ? "default" : "outline"}
              className={cn(
                "cursor-pointer text-xs transition-colors select-none",
                isActive
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => onSelect(s)}
            >
              {isActive ? "✓ " : "+ "}
              {s}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestionChips;
