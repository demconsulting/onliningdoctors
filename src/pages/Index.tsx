import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import MedicalDisclaimerBanner from "@/components/layout/MedicalDisclaimerBanner";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import Seo from "@/components/seo/Seo";

const StatsSection = lazy(() => import("@/components/landing/StatsSection"));
const WhyChooseSection = lazy(() => import("@/components/landing/WhyChooseSection"));
const FindDoctorSection = lazy(() => import("@/components/landing/FindDoctorSection"));
const DoctorCTASection = lazy(() => import("@/components/landing/DoctorCTASection"));
const FAQSection = lazy(() => import("@/components/landing/FAQSection"));

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

const sectionComponents: Record<string, React.ComponentType> = {
  hero: HeroSection,
  stats: StatsSection,
  "why-choose": WhyChooseSection,
  "find-doctor": FindDoctorSection,
  "doctor-cta": DoctorCTASection,
  faq: FAQSection,
};

const SectionPlaceholder = () => <div className="min-h-[400px]" aria-hidden="true" />;

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

  useEffect(() => {
    // Prefetch likely-next routes only on capable networks. Skip on mobile/2G/3G/Save-Data
    // so we don't burn the user's cellular budget before they've interacted.
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData) return;
    if (conn?.effectiveType && /(^|-)(2g|3g)$/.test(conn.effectiveType)) return;
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

    const prefetch = () => {
      // Doctors is the most likely next destination from the hero CTA.
      import("./Doctors");
      // Only pull Login on larger screens; on mobile we wait until the user taps it.
      if (!isMobile) import("./Login");
      // Dashboard is heavy and auth-gated — never prefetch from the public landing page.
    };
    const win = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (typeof win.requestIdleCallback === "function") {
      win.requestIdleCallback(prefetch);
    } else {
      setTimeout(prefetch, 2500);
    }
  }, []);

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
        {sections
          .filter((s) => s.visible)
          .map((s) => {
            const Component = sectionComponents[s.key];
            if (!Component) return null;
            if (s.key === "hero") {
              return <Component key={s.key} />;
            }
            return (
              <Suspense key={s.key} fallback={<SectionPlaceholder />}>
                <Component />
              </Suspense>
            );
          })}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
