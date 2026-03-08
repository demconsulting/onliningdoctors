import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Calendar, FileText, HeartPulse } from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";
import ProfileEdit from "@/components/patient/ProfileEdit";
import MedicalInfo from "@/components/patient/MedicalInfo";
import AppointmentList from "@/components/patient/AppointmentList";
import BookAppointment from "@/components/patient/BookAppointment";
import DocumentUpload from "@/components/patient/DocumentUpload";
import ReviewPromptBanner from "@/components/patient/ReviewPromptBanner";

const Dashboard = () => {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("appointments");
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/login");
      else setUser(session.user);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login");
      else setUser(session.user);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading || !user) {
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
          <h1 className="font-display text-3xl font-bold text-foreground">Patient Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.user_metadata?.full_name || user.email}</p>
        </div>

        <ReviewPromptBanner user={user} onSwitchToAppointments={() => setActiveTab("appointments")} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto lg:grid-cols-5">
            <TabsTrigger value="appointments" className="gap-1.5">
              <Calendar className="h-4 w-4" /> Appointments
            </TabsTrigger>
            <TabsTrigger value="book" className="gap-1.5">
              <Calendar className="h-4 w-4" /> Book
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="medical" className="gap-1.5">
              <HeartPulse className="h-4 w-4" /> Medical
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5">
              <FileText className="h-4 w-4" /> Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <AppointmentList user={user} />
          </TabsContent>
          <TabsContent value="book">
            <BookAppointment user={user} onBooked={() => setActiveTab("appointments")} />
          </TabsContent>
          <TabsContent value="profile">
            <ProfileEdit user={user} />
          </TabsContent>
          <TabsContent value="medical">
            <MedicalInfo user={user} />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentUpload user={user} />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
