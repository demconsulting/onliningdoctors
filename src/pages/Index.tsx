import { useEffect, useRef, useState, lazy, Suspense, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import MedicalDisclaimerBanner from "@/components/layout/MedicalDisclaimerBanner";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import Seo from "@/components/seo/Seo";

// Single consolidated chunk for ALL below-the-fold sections. This avoids
// over-fragmentation (5 tiny chunks → 1) and reduces homepage JS requests.
const BelowTheFold = lazy(() => import("@/components/landing/BelowTheFold"));

interface SectionConfig {
  key: string;
  label: string;
  visible: boolean;
}

const defaultOrder: SectionConfig[] = [
  { key: "hero", label: "Hero Section", visible: true },
  { key: "stats", label: "Stats Section", visible: true },
  { key: "why-choose", label: "Why Choose Section", visible: true },
  { key: "find-doctor", label: "Find Doctor Section", visible: true },
  { key: "doctor-cta", label: "Doctor CTA Section", visible: true },
  { key: "faq", label: "FAQ Section", visible: true },
];

const SectionPlaceholder = () => <div className="min-h-[400px]" aria-hidden="true" />;

/**
 * Loads its children (the consolidated below-the-fold chunk) only when the
 * sentinel scrolls near the viewport, OR after the browser becomes idle.
 * This keeps the initial JS execution focused on the hero + nav.
 */
const DeferredBelowTheFold = memo(({ keys }: { keys: string[] }) => {
  const [load, setLoad] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (load) return;
    let cancelled = false;
    const trigger = () => { if (!cancelled) setLoad(true); };

    // 1. IntersectionObserver — load when the user scrolls toward the fold.
    let io: IntersectionObserver | null = null;
    if (sentinelRef.current && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            trigger();
            io?.disconnect();
          }
        },
        { rootMargin: "600px 0px" }
      );
      io.observe(sentinelRef.current);
    } else {
      trigger();
    }

    // 2. Idle fallback — load anyway after the page settles, so users who
    // don't scroll still get the rest of the page eventually.
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const idleId = typeof win.requestIdleCallback === "function"
      ? win.requestIdleCallback(trigger, { timeout: 6000 })
      : window.setTimeout(trigger, 4000);

    return () => {
      cancelled = true;
      io?.disconnect();
      if (typeof idleId === "number") clearTimeout(idleId);
    };
  }, [load]);

  if (!load) {
    return <div ref={sentinelRef} className="min-h-[400px]" aria-hidden="true" />;
  }

  return (
    <Suspense fallback={<SectionPlaceholder />}>
      <BelowTheFold keys={keys} />
    </Suspense>
  );
});
DeferredBelowTheFold.displayName = "DeferredBelowTheFold";

const Index = () => {
  const [sections, setSections] = useState<SectionConfig[]>(defaultOrder);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("value")
      .eq("key", "section_order")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const stored = data.value as unknown as SectionConfig[];
          const storedKeys = new Set(stored.map((s) => s.key));
          const merged = [
            ...stored,
            ...defaultOrder.filter((d) => !storedKeys.has(d.key)),
          ];
          setSections(merged);
        }
      });
  }, []);

  const visibleKeys = sections.filter((s) => s.visible).map((s) => s.key);
  const heroVisible = visibleKeys.includes("hero");
  const belowKeys = visibleKeys.filter((k) => k !== "hero");

  return (
    <div className="min-h-screen flex flex-col">
      <Seo
        title="Doctors Onlining | Video Consultations in South Africa"
        description="Doctors Onlining is a video consultation platform connecting patients with qualified doctors for fast, secure, non-emergency care anywhere in South Africa."
        path="/"
      />
      <MedicalDisclaimerBanner />
      <Navbar />
      <main className="flex-1">
        {heroVisible && <HeroSection />}
        {belowKeys.length > 0 && <DeferredBelowTheFold keys={belowKeys} />}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
