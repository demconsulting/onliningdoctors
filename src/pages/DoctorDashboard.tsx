import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, Clock, DollarSign, Stethoscope, TrendingUp } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import DoctorProfile from "@/components/doctor/DoctorProfile";
import AvailabilityManager from "@/components/doctor/AvailabilityManager";
import PricingTiers from "@/components/doctor/PricingTiers";
import DoctorAppointments from "@/components/doctor/DoctorAppointments";
import DoctorEarnings from "@/components/doctor/DoctorEarnings";

const DoctorDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDoctor, setIsDoctor] = useState(false);
  const [activeTab, setActiveTab] = useState("appointments");
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
          <p className="text-muted-foreground">Manage your practice, {user.user_metadata?.full_name || user.email}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:w-auto">
            <TabsTrigger value="appointments" className="gap-1.5">
              <Calendar className="h-4 w-4" /> Appointments
            </TabsTrigger>
            <TabsTrigger value="earnings" className="gap-1.5">
              <TrendingUp className="h-4 w-4" /> Earnings
            </TabsTrigger>
            <TabsTrigger value="availability" className="gap-1.5">
              <Clock className="h-4 w-4" /> Availability
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1.5">
              <DollarSign className="h-4 w-4" /> Pricing
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5">
              <Stethoscope className="h-4 w-4" /> Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <DoctorAppointments user={user} />
          </TabsContent>
          <TabsContent value="availability">
            <AvailabilityManager user={user} />
          </TabsContent>
          <TabsContent value="pricing">
            <PricingTiers user={user} doctorCountry={doctorCountry} />
          </TabsContent>
          <TabsContent value="profile">
            <DoctorProfile user={user} />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default DoctorDashboard;
