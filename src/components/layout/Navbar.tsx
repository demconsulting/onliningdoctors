import { lazy, Suspense, useState, useEffect } from "react";
import { useBranding } from "@/hooks/useBranding";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const NotificationBell = lazy(() => import("@/components/notifications/NotificationBell"));

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isDoctor, setIsDoctor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { branding, logoSrc } = useBranding();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkRole(session.user.id);
      else { setIsDoctor(false); setIsAdmin(false); }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkRole(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (data) {
      setIsDoctor(data.some(r => r.role === "doctor"));
      setIsAdmin(data.some(r => r.role === "admin"));
    }
  };

  const dashboardPath = isDoctor ? "/doctor-dashboard" : "/dashboard";
  const dashboardLabel = isDoctor ? "Doctor Dashboard" : "Dashboard";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <>
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center" aria-label="Doctors Onlining home">
          <img
            src={logoSrc}
            alt="Doctors Onlining"
            style={{ height: branding.navbar_height }}
            className="w-auto select-none"
            loading="eager"
            decoding="async"
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link to="/doctors" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Find Doctors</Link>
          <Link to="/wellness-plus" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Wellness+</Link>
          <a href="/#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">How It Works</a>
          <a href="/#for-doctors" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">For Doctors</a>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Suspense fallback={null}>
                <NotificationBell />
              </Suspense>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>Admin</Button>
              )}
              {isDoctor && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/practice/team")}>Practice</Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate(dashboardPath)}>
                {dashboardLabel}
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>Log out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Log in</Button>
              <Button size="sm" onClick={() => navigate("/signup")}>Sign up</Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
        >
          {isOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div id="mobile-menu" className="border-t border-border bg-card p-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/doctors" className="text-sm font-medium text-muted-foreground" onClick={() => setIsOpen(false)}>Find Doctors</Link>
            <Link to="/wellness-plus" className="text-sm font-medium text-muted-foreground" onClick={() => setIsOpen(false)}>Wellness+</Link>
            <a href="/#how-it-works" className="text-sm font-medium text-muted-foreground" onClick={() => setIsOpen(false)}>How It Works</a>
            <a href="/#for-doctors" className="text-sm font-medium text-muted-foreground" onClick={() => setIsOpen(false)}>For Doctors</a>
            <div className="flex gap-2 pt-2">
              {user ? (
                <>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => { navigate("/admin"); setIsOpen(false); }}>Admin</Button>
                  )}
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => { navigate(dashboardPath); setIsOpen(false); }}>{dashboardLabel}</Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleLogout}>Log out</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => { navigate("/login"); setIsOpen(false); }}>Log in</Button>
                  <Button size="sm" className="flex-1" onClick={() => { navigate("/signup"); setIsOpen(false); }}>Sign up</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
    {/* Spacer to offset the fixed navbar so page content isn't hidden underneath. */}
    <div aria-hidden className="h-16" />
    </>
  );
};

export default Navbar;
