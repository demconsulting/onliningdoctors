import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LayoutDashboard, Calendar, Clock, DollarSign, Stethoscope, Wallet, Sparkles, WalletCards, ShieldCheck, CalendarRange } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import DoctorProfile from "@/components/doctor/DoctorProfile";
import AvailabilityManager from "@/components/doctor/AvailabilityManager";
import PricingTiers from "@/components/doctor/PricingTiers";
import DoctorAppointments from "@/components/doctor/DoctorAppointments";
import DoctorOverview from "@/components/doctor/DoctorOverview";
// Lazy-load heavy / less-frequented tabs
const DoctorBilling = lazy(() => import("@/components/doctor/DoctorBilling"));
const DoctorWellnessPlus = lazy(() => import("@/components/doctor/DoctorWellnessPlus"));
const DoctorEarnings = lazy(() => import("@/components/doctor/DoctorEarnings"));
const DoctorWallet = lazy(() => import("@/components/doctor/DoctorWallet"));
const DoctorPrescriptions = lazy(() => import("@/components/doctor/DoctorPrescriptions"));
const PrescriptionTemplates = lazy(() => import("@/components/doctor/PrescriptionTemplates"));
const DoctorMedicalAids = lazy(() => import("@/components/doctor/DoctorMedicalAids"));
const DoctorMedicalAidRequests = lazy(() => import("@/components/doctor/DoctorMedicalAidRequests"));
const PracticeCalendar = lazy(() => import("@/components/calendar/PracticeCalendar"));
import PracticeDashboardCard from "@/components/doctor/PracticeDashboardCard";

const TabFallback = () => (
  <div className="flex items-center justify-center py-12" role="status" aria-label="Loading">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const DoctorDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDoctor, setIsDoctor] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [doctorCountry, setDoctorCountry] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      setUser(session.user);

      // Check doctor role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "doctor");

      if (!roles || roles.length === 0) {
        navigate("/dashboard"); // Redirect patients to patient dashboard
        return;
      }

      // Ensure doctor record exists
      const { data: doctorRecord } = await supabase
        .from("doctors")
        .select("id")
        .eq("profile_id", session.user.id)
        .single();

      if (!doctorRecord) {
        // Auto-create doctor record
        await supabase.from("doctors").insert({ profile_id: session.user.id });
      }

      // Fetch doctor's country from profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("country")
        .eq("id", session.user.id)
        .single();

      if (profileData?.country) {
        setDoctorCountry(profileData.country);
      }

      setIsDoctor(true);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/login");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading || !user || !isDoctor) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-foreground">Doctor Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.user_metadata?.full_name || user.email}</p>
        </div>

        <PracticeDashboardCard userId={user.id} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile-friendly: horizontal scroll on small screens */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-max sm:w-full sm:grid sm:grid-cols-10">
              <TabsTrigger value="dashboard" className="gap-1.5">
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5">
                <CalendarRange className="h-4 w-4" /> Calendar
              </TabsTrigger>
              <TabsTrigger value="appointments" className="gap-1.5">
                <Calendar className="h-4 w-4" /> Appointments
              </TabsTrigger>
              <TabsTrigger value="availability" className="gap-1.5">
                <Clock className="h-4 w-4" /> Availability
              </TabsTrigger>
              <TabsTrigger value="pricing" className="gap-1.5">
                <DollarSign className="h-4 w-4" /> Pricing
              </TabsTrigger>
              <TabsTrigger value="medical-aid" className="gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Medical Aid
              </TabsTrigger>
              <TabsTrigger value="wallet" className="gap-1.5">
                <WalletCards className="h-4 w-4" /> Wallet
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1.5">
                <Stethoscope className="h-4 w-4" /> Profile
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5">
                <Wallet className="h-4 w-4" /> Payments
              </TabsTrigger>
              <TabsTrigger value="wellness" className="gap-1.5">
                <Sparkles className="h-4 w-4" /> Wellness+
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard">
            <DoctorOverview user={user} doctorCountry={doctorCountry} onNavigateTab={setActiveTab} />
          </TabsContent>
          <TabsContent value="calendar">
            <Suspense fallback={<TabFallback />}>
              <PracticeCalendar user={user} doctorId={user.id} canManage />
            </Suspense>
          </TabsContent>
          <TabsContent value="appointments">
            <DoctorAppointments user={user} />
          </TabsContent>
          <TabsContent value="availability">
            <AvailabilityManager user={user} />
          </TabsContent>
          <TabsContent value="pricing">
            <PricingTiers user={user} doctorCountry={doctorCountry} />
          </TabsContent>
          <TabsContent value="medical-aid">
            <Suspense fallback={<TabFallback />}>
              <DoctorMedicalAidRequests user={user} />
              <div className="h-4" />
              <DoctorMedicalAids user={user} />
            </Suspense>
          </TabsContent>
          <TabsContent value="wallet">
            <Suspense fallback={<TabFallback />}>
              <DoctorWallet user={user} doctorCountry={doctorCountry} />
            </Suspense>
          </TabsContent>
          <TabsContent value="profile">
            <DoctorProfile user={user} />
          </TabsContent>
          <TabsContent value="payments">
            <Suspense fallback={<TabFallback />}>
              <DoctorBilling user={user} />
            </Suspense>
          </TabsContent>
          <TabsContent value="wellness">
            <Suspense fallback={<TabFallback />}>
              <DoctorWellnessPlus />
            </Suspense>
          </TabsContent>
          {/* Advanced tools — accessible from the Dashboard overview */}
          <TabsContent value="earnings">
            <Suspense fallback={<TabFallback />}><DoctorEarnings user={user} doctorCountry={doctorCountry} /></Suspense>
          </TabsContent>
          <TabsContent value="prescriptions">
            <Suspense fallback={<TabFallback />}><DoctorPrescriptions user={user} /></Suspense>
          </TabsContent>
          <TabsContent value="templates">
            <Suspense fallback={<TabFallback />}><PrescriptionTemplates user={user} /></Suspense>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default DoctorDashboard;
