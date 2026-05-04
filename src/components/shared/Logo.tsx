import { Link } from "react-router-dom";
import logoSrc from "@/assets/logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  imgClassName?: string;
  linked?: boolean;
  to?: string;
  alt?: string;
}

/**
 * Doctors Onlining brand logo (icon + wordmark combined).
 * Use everywhere the brand mark appears (navbar, footer, auth screens, etc.).
 */
const Logo = ({
  className,
  imgClassName,
  linked = true,
  to = "/",
  alt = "Doctors Onlining — Quality Care, Anytime, Anywhere",
}: LogoProps) => {
  const img = (
    <img
      src={logoSrc}
      alt={alt}
      className={cn("h-10 w-auto select-none", imgClassName)}
      loading="eager"
      decoding="async"
    />
  );

  if (!linked) return <span className={cn("inline-flex items-center", className)}>{img}</span>;

  return (
    <Link to={to} className={cn("inline-flex items-center", className)} aria-label="Doctors Onlining home">
      {img}
    </Link>
  );
};

export default Logo;
