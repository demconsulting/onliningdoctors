import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Calendar, FileText, HeartPulse, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User as SupaUser } from "@supabase/supabase-js";
import ProfileEdit from "@/components/patient/ProfileEdit";
import MedicalInfo from "@/components/patient/MedicalInfo";
import AppointmentList from "@/components/patient/AppointmentList";
import BookAppointment from "@/components/patient/BookAppointment";
import DocumentUpload from "@/components/patient/DocumentUpload";
import FamilyMembers from "@/components/patient/FamilyMembers";
import ReviewPromptBanner from "@/components/patient/ReviewPromptBanner";

const Dashboard = () => {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("appointments");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Verify payment on return from Paystack
  const verifyPayment = useCallback(async () => {
    const ref = searchParams.get("reference") || searchParams.get("trxref");
    if (!ref) return;

    // Clean up URL
    searchParams.delete("reference");
    searchParams.delete("trxref");
    setSearchParams(searchParams, { replace: true });

    try {
      const { data, error } = await supabase.functions.invoke("paystack-payment", {
        body: { action: "verify", reference: ref },
      });

      if (error || data?.error) {
        toast({ variant: "destructive", title: "Payment verification failed", description: data?.error || error?.message });
      } else if (data?.status === "success") {
        toast({ title: "Payment successful!", description: `${data.currency} ${data.amount} paid via ${data.channel}` });
      } else {
        toast({ variant: "destructive", title: "Payment not completed", description: "Please try again or contact support." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Verification error", description: err.message });
    }
  }, [searchParams, setSearchParams, toast]);

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

  // Verify payment after auth is ready
  useEffect(() => {
    if (user) verifyPayment();
  }, [user, verifyPayment]);

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
      <main className="container mx-auto flex-1 px-3 py-4 sm:px-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Patient Dashboard</h1>
          <p className="truncate text-sm text-muted-foreground sm:text-base">
            Welcome back, {user.user_metadata?.full_name || user.email}
          </p>
        </div>

        <ReviewPromptBanner user={user} onSwitchToAppointments={() => setActiveTab("appointments")} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Mobile: horizontally scrollable tab strip. Desktop: grid. */}
          <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <TabsList className="inline-flex w-max gap-1 sm:grid sm:w-full sm:grid-cols-3 sm:gap-0 lg:w-auto lg:grid-cols-6">
              <TabsTrigger value="appointments" className="gap-1.5 whitespace-nowrap">
                <Calendar className="h-4 w-4" /> Appointments
              </TabsTrigger>
              <TabsTrigger value="book" className="gap-1.5 whitespace-nowrap">
                <Calendar className="h-4 w-4" /> Book
              </TabsTrigger>
              <TabsTrigger value="family" className="gap-1.5 whitespace-nowrap">
                <Users className="h-4 w-4" /> Family
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1.5 whitespace-nowrap">
                <User className="h-4 w-4" /> Profile
              </TabsTrigger>
              <TabsTrigger value="medical" className="gap-1.5 whitespace-nowrap">
                <HeartPulse className="h-4 w-4" /> Medical
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5 whitespace-nowrap">
                <FileText className="h-4 w-4" /> Documents
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="appointments">
            <AppointmentList user={user} />
          </TabsContent>
          <TabsContent value="book">
            <BookAppointment user={user} onBooked={() => setActiveTab("appointments")} />
          </TabsContent>
          <TabsContent value="family">
            <FamilyMembers user={user} />
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
