import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const PreviewWrapper = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs text-muted-foreground"
        onClick={() => setOpen(!open)}
      >
        {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {open ? "Hide Preview" : "Show Preview"}
      </Button>
      {open && (
        <div className="rounded-lg border-2 border-dashed border-primary/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Live Preview</p>
          {children}
        </div>
      )}
    </div>
  );
};

export default PreviewWrapper;
