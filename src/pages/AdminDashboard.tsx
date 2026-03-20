import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminAppointments from "@/components/admin/AdminAppointments";
import AdminReviews from "@/components/admin/AdminReviews";
import AdminConsultationOutcomes from "@/components/admin/AdminConsultationOutcomes";
import AdminSpecialties from "@/components/admin/AdminSpecialties";
import AdminContacts from "@/components/admin/AdminContacts";
import AdminFaqs from "@/components/admin/AdminFaqs";
import AdminHero from "@/components/admin/AdminHero";
import AdminStats from "@/components/admin/AdminStats";
import AdminAuditLogs from "@/components/admin/AdminAuditLogs";
import AdminDoctorVerification from "@/components/admin/AdminDoctorVerification";
import AdminSiteSettings from "@/components/admin/AdminSiteSettings";
import AdminWhyChoose from "@/components/admin/AdminWhyChoose";
import AdminFindDoctor from "@/components/admin/AdminFindDoctor";
import AdminDoctorCTA from "@/components/admin/AdminDoctorCTA";
import AdminFooter from "@/components/admin/AdminFooter";
import AdminSectionOrder from "@/components/admin/AdminSectionOrder";
import AdminPaymentConfig from "@/components/admin/AdminPaymentConfig";
import AdminPayments from "@/components/admin/AdminPayments";
import AdminPayouts from "@/components/admin/AdminPayouts";
import { Loader2 } from "lucide-react";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin");

      if (!roles || roles.length === 0) {
        navigate("/"); // Not admin
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };
    init();
  }, [navigate]);

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "section-order": return <AdminSectionOrder />;
      case "hero": return <AdminHero />;
      case "stats": return <AdminStats />;
      case "why-choose": return <AdminWhyChoose />;
      case "find-doctor": return <AdminFindDoctor />;
      case "doctor-cta": return <AdminDoctorCTA />;
      case "footer": return <AdminFooter />;
      case "users": return <AdminUsers />;
      case "appointments": return <AdminAppointments />;
      case "reviews": return <AdminReviews />;
      case "consultation-outcomes": return <AdminConsultationOutcomes />;
      case "specialties": return <AdminSpecialties />;
      case "contacts": return <AdminContacts />;
      case "faqs": return <AdminFaqs />;
      case "payment-config": return <AdminPaymentConfig />;
      case "payments": return <AdminPayments />;
      case "payouts": return <AdminPayouts />;
      case "audit-logs": return <AdminAuditLogs />;
      case "doctor-verification": return <AdminDoctorVerification />;
      case "site-settings": return <AdminSiteSettings />;
      default: return <AdminHero />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card/80 backdrop-blur-lg">
            <SidebarTrigger className="mr-3" />
            <h1 className="font-display text-lg font-bold text-foreground capitalize">{activeSection}</h1>
          </header>
          <main className="flex-1 p-6">{renderSection()}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
