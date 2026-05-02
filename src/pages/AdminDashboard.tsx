import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Loader2 } from "lucide-react";

const AdminUsers = lazy(() => import("@/components/admin/AdminUsers"));
const AdminAppointments = lazy(() => import("@/components/admin/AdminAppointments"));
const AdminReviews = lazy(() => import("@/components/admin/AdminReviews"));
const AdminConsultationOutcomes = lazy(() => import("@/components/admin/AdminConsultationOutcomes"));
const AdminSpecialties = lazy(() => import("@/components/admin/AdminSpecialties"));
const AdminContacts = lazy(() => import("@/components/admin/AdminContacts"));
const AdminFaqs = lazy(() => import("@/components/admin/AdminFaqs"));
const AdminHero = lazy(() => import("@/components/admin/AdminHero"));
const AdminStats = lazy(() => import("@/components/admin/AdminStats"));
const AdminAuditLogs = lazy(() => import("@/components/admin/AdminAuditLogs"));
const AdminDoctorVerification = lazy(() => import("@/components/admin/AdminDoctorVerification"));
const AdminSiteSettings = lazy(() => import("@/components/admin/AdminSiteSettings"));
const AdminWhyChoose = lazy(() => import("@/components/admin/AdminWhyChoose"));
const AdminFindDoctor = lazy(() => import("@/components/admin/AdminFindDoctor"));
const AdminDoctorCTA = lazy(() => import("@/components/admin/AdminDoctorCTA"));
const AdminFooter = lazy(() => import("@/components/admin/AdminFooter"));
const AdminSectionOrder = lazy(() => import("@/components/admin/AdminSectionOrder"));
const AdminPaymentConfig = lazy(() => import("@/components/admin/AdminPaymentConfig"));
const AdminPayments = lazy(() => import("@/components/admin/AdminPayments"));
const AdminPayouts = lazy(() => import("@/components/admin/AdminPayouts"));
const AdminAIAssistant = lazy(() => import("@/components/admin/AdminAIAssistant"));
const AdminCountries = lazy(() => import("@/components/admin/AdminCountries"));
const AdminLegalDocuments = lazy(() => import("@/components/admin/AdminLegalDocuments"));
const AdminConsultationCategories = lazy(() => import("@/components/admin/AdminConsultationCategories"));

const SectionFallback = () => (
  <div className="flex justify-center py-10" role="status" aria-label="Loading admin section">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

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
      case "consultation-categories": return <AdminConsultationCategories />;
      case "payment-config": return <AdminPaymentConfig />;
      case "payments": return <AdminPayments />;
      case "payouts": return <AdminPayouts />;
      case "countries": return <AdminCountries />;
      case "legal-documents": return <AdminLegalDocuments />;
      case "ai-assistant": return <AdminAIAssistant />;
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
          <main className="flex-1 p-6">
            <Suspense fallback={<SectionFallback />}>{renderSection()}</Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
