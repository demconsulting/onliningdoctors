import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import MedicalDisclaimerBanner from "@/components/layout/MedicalDisclaimerBanner";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import WhyChooseSection from "@/components/landing/WhyChooseSection";
import FindDoctorSection from "@/components/landing/FindDoctorSection";
import DoctorCTASection from "@/components/landing/DoctorCTASection";
import FAQSection from "@/components/landing/FAQSection";
import Seo from "@/components/seo/Seo";

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

const sectionComponents: Record<string, React.FC> = {
  hero: HeroSection,
  stats: StatsSection,
  "why-choose": WhyChooseSection,
  "find-doctor": FindDoctorSection,
  "doctor-cta": DoctorCTASection,
  faq: FAQSection,
};

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
            return Component ? <Component key={s.key} /> : null;
          })}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
