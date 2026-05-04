import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Video, Clock, Star, Heart, Activity } from "lucide-react";
import { motion } from "framer-motion";

const iconMap: Record<string, React.ElementType> = { Shield, Video, Clock, Star, Heart, Activity };

interface HeroFeature { icon: string; label: string; sub: string; }
interface HeroContent {
  badge: string; title: string; highlight: string; subtitle: string;
  cta_primary: string; cta_secondary: string; features: HeroFeature[];
  desktop_video_enabled?: boolean;
  desktop_video_url?: string;
}

const fallback: HeroContent = {
  badge: "Trusted Video Consultations",
  title: "Your Doctor,",
  highlight: "One Click Away",
  subtitle: "Connect with certified specialists via secure video consultations. Book appointments, share documents, and get care — all from home.",
  cta_primary: "Find a Doctor",
  cta_secondary: "Get Started Free",
  features: [
    { icon: "Video", label: "HD Video Calls", sub: "Crystal clear" },
    { icon: "Shield", label: "End-to-End Encrypted", sub: "Your data is safe" },
    { icon: "Clock", label: "24/7 Available", sub: "Anytime, anywhere" },
  ],
};

// Responsive video sources are declared inline in the <video> element below.

const HeroSection = () => {
  const navigate = useNavigate();
  const [hero, setHero] = useState<HeroContent>(fallback);
  const [showVideo, setShowVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  // Mobile-only: defer the hero image until after first paint so it doesn't
  // become the LCP element. Text + CTA paint over the gradient first.
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  const [showMobileImage, setShowMobileImage] = useState(false);
  const [mobileImageLoaded, setMobileImageLoaded] = useState(false);
  const [showMobileBadges, setShowMobileBadges] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    if (!isMobile) { setShowMobileImage(true); setShowMobileBadges(true); return; }
    // Wait for first paint, then load image + badges.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowMobileImage(true);
        // Badges are below the primary CTA — push further out.
        const t = window.setTimeout(() => setShowMobileBadges(true), 600);
        return () => clearTimeout(t);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [isMobile]);

  useEffect(() => {
    supabase.from("site_content").select("value").eq("key", "hero").single().then(({ data }) => {
      if (data?.value) setHero(data.value as unknown as HeroContent);
    });
  }, []);

  // Progressive enhancement: load the video only on desktop, after first paint,
  // skip on slow/data-saver connections, and respect the admin toggle.
  const videoEnabled = hero.desktop_video_enabled !== false;

  useEffect(() => {
    if (!videoEnabled) { setShowVideo(false); return; }
    if (typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isDesktop || prefersReducedMotion) return;

    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData) return;
    if (conn?.effectiveType && /(^|-)(2g|3g)$/.test(conn.effectiveType)) return;

    const win = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    const trigger = () => setShowVideo(true);
    const id = typeof win.requestIdleCallback === "function"
      ? win.requestIdleCallback(trigger, { timeout: 2500 })
      : window.setTimeout(trigger, 1500);
    return () => { if (typeof id === "number") clearTimeout(id); };
  }, [videoEnabled]);

  return (
    <section
      className="relative overflow-hidden min-h-[600px] lg:min-h-[700px]"
      style={{
        // Lightweight gradient backdrop — paints instantly on mobile while the
        // hero image is deferred. Desktop covers this with the <img> below.
        background:
          "linear-gradient(135deg, hsl(199 89% 22%) 0%, hsl(210 60% 14%) 55%, hsl(220 30% 8%) 100%)",
      }}
    >
      {/* Desktop: image is preloaded and rendered immediately. Mobile: rendered
          after first paint and faded in, so it never wins LCP. */}
      {!isMobile ? (
        <img
          src="/hero-bg.webp"
          alt=""
          width={1920}
          height={1080}
          loading="eager"
          {...({ fetchpriority: "high" } as { fetchpriority: string })}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : showMobileImage ? (
        <img
          src="/hero-bg-mobile.webp"
          alt=""
          width={800}
          height={600}
          loading="lazy"
          {...({ fetchpriority: "low" } as { fetchpriority: string })}
          decoding="async"
          onLoad={() => setMobileImageLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${mobileImageLoaded ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
      {showVideo && (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/hero-bg-poster.jpg"
          onCanPlay={() => setVideoReady(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoReady ? "opacity-100" : "opacity-0"}`}
        >
          {hero.desktop_video_url && hero.desktop_video_url.trim() ? (
            // Admin override: use the single provided URL as-is.
            <source src={hero.desktop_video_url.trim()} />
          ) : (
            <>
              {/* Large desktops: 720p. WebM first (smaller), MP4 fallback. */}
              <source src="/hero-bg-720.webm" type="video/webm" media="(min-width: 1440px)" />
              <source src="/hero-bg-720.mp4" type="video/mp4" media="(min-width: 1440px)" />
              {/* Standard desktops/laptops: 480p to keep payload tiny. */}
              <source src="/hero-bg-480.webm" type="video/webm" />
              <source src="/hero-bg-480.mp4" type="video/mp4" />
            </>
          )}
        </video>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-transparent" />
      <div className="container relative z-10 mx-auto flex min-h-[600px] items-center px-6 py-20 lg:min-h-[700px] lg:py-28">
        <div className="max-w-2xl text-left">
          <motion.div initial={{ opacity: 0.01, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="mb-6 font-display text-4xl font-extrabold tracking-tight text-white md:text-6xl lg:text-7xl">
              {hero.title}{" "}
              <span className="text-gradient">{hero.highlight}</span>
            </h1>
            <p className="mb-8 max-w-lg text-base text-white/80 md:text-lg">{hero.subtitle}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="gap-2 gradient-primary border-0 text-primary-foreground" onClick={() => navigate("/doctors")}>
                {hero.cta_primary} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/60 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate("/signup")}>
                {hero.cta_secondary}
              </Button>
            </div>
          </motion.div>

          {hero.features.length > 0 && (
            <motion.div
              className="mt-14 flex flex-wrap gap-8"
              initial={{ opacity: 0.01, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {hero.features.map((item) => {
                const Icon = iconMap[item.icon] || Video;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="block text-sm font-semibold text-white">{item.label}</span>
                      <span className="text-xs text-white/60">{item.sub}</span>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
