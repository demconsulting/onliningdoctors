import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import NotificationBell from "@/components/notifications/NotificationBell";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isDoctor, setIsDoctor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
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
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Stethoscope className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Doco<span className="text-primary">.</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link to="/doctors" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Doctors</Link>
          <Link to="/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">About</Link>
          <Link to="/contact" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Contact</Link>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <NotificationBell />
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>Admin</Button>
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
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="border-t border-border bg-card p-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/doctors" className="text-sm font-medium text-muted-foreground" onClick={() => setIsOpen(false)}>Doctors</Link>
            <Link to="/about" className="text-sm font-medium text-muted-foreground" onClick={() => setIsOpen(false)}>About</Link>
            <Link to="/contact" className="text-sm font-medium text-muted-foreground" onClick={() => setIsOpen(false)}>Contact</Link>
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
  );
};

export default Navbar;
