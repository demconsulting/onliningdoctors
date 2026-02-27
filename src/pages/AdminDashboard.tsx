import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminAppointments from "@/components/admin/AdminAppointments";
import AdminReviews from "@/components/admin/AdminReviews";
import AdminSpecialties from "@/components/admin/AdminSpecialties";
import AdminContacts from "@/components/admin/AdminContacts";
import AdminFaqs from "@/components/admin/AdminFaqs";
import AdminHero from "@/components/admin/AdminHero";
import AdminStats from "@/components/admin/AdminStats";
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
      case "hero": return <AdminHero />;
      case "stats": return <AdminStats />;
      case "users": return <AdminUsers />;
      case "appointments": return <AdminAppointments />;
      case "reviews": return <AdminReviews />;
      case "specialties": return <AdminSpecialties />;
      case "contacts": return <AdminContacts />;
      case "faqs": return <AdminFaqs />;
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
