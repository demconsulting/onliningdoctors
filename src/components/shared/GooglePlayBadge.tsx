import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface GooglePlayBadgeProps {
  href?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * "Get it on Google Play" style badge.
 * Update `href` to the live Play Store listing once published.
 */
const GooglePlayBadge = ({
  href = "https://play.google.com/store/apps/details?id=com.doctorsonlining.app",
  className,
  size = "md",
}: GooglePlayBadgeProps) => {
  const sizes = {
    sm: "h-10 px-3 gap-2 text-[10px]",
    md: "h-12 px-4 gap-3 text-xs",
    lg: "h-14 px-5 gap-3 text-sm",
  } as const;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Get the Doctors Onlining app on Google Play"
      className={cn(
        "inline-flex items-center rounded-xl border border-white/20 bg-black text-white shadow-md transition-transform hover:scale-[1.03] hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        sizes[size],
        className
      )}
    >
      <Smartphone className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <span className="flex flex-col leading-tight text-left">
        <span className="opacity-80">GET IT ON</span>
        <span className="font-display text-base font-semibold tracking-tight">Google Play</span>
      </span>
    </a>
  );
};

export default GooglePlayBadge;
