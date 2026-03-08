import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import WhyChooseSection from "@/components/landing/WhyChooseSection";
import FindDoctorSection from "@/components/landing/FindDoctorSection";
import DoctorCTASection from "@/components/landing/DoctorCTASection";

const Index = () => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">
      <HeroSection />
      <WhyChooseSection />
      <FindDoctorSection />
      <DoctorCTASection />
    </main>
  </div>
);

export default Index;
