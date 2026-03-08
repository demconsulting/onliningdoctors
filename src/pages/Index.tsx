import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import WhyChooseSection from "@/components/landing/WhyChooseSection";
import FindDoctorSection from "@/components/landing/FindDoctorSection";
import DoctorCTASection from "@/components/landing/DoctorCTASection";

const Index = () => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">
      <HeroSection />
      <StatsSection />
      <WhyChooseSection />
      <FindDoctorSection />
      <DoctorCTASection />
    </main>
    <Footer />
  </div>
);

export default Index;
