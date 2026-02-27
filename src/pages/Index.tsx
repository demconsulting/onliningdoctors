import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import SpecialtiesSection from "@/components/landing/SpecialtiesSection";
import FAQSection from "@/components/landing/FAQSection";

const Index = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1">
      <HeroSection />
      <StatsSection />
      <SpecialtiesSection />
      <FAQSection />
    </main>
    <Footer />
  </div>
);

export default Index;
