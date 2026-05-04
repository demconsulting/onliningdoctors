import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
// Lazy-load the floating chat widget AND defer mounting it until the user
// interacts or the page has settled, so its framer-motion + realtime payload
// never competes with homepage LCP.
const ChatWidget = lazy(() => import("./components/chat/ChatWidget"));
import Index from "./pages/Index";

// Code-split: load route bundles only when navigated to.
// Keeps the landing page (Index) bundle small and improves LCP.
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const DoctorSignup = lazy(() => import("./pages/DoctorSignup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const EmailConfirmed = lazy(() => import("./pages/EmailConfirmed"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DoctorDashboard = lazy(() => import("./pages/DoctorDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const CallPage = lazy(() => import("./pages/CallPage"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const DoctorBenefits = lazy(() => import("./pages/DoctorBenefits"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const Doctors = lazy(() => import("./pages/Doctors"));
const DoctorDetail = lazy(() => import("./pages/DoctorDetail"));
const DependentInvite = lazy(() => import("./pages/DependentInvite"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div
    className="flex min-h-[60vh] items-center justify-center"
    role="status"
    aria-live="polite"
    aria-label="Loading page"
  >
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const DeferredChatWidget = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const trigger = () => { if (!cancelled) setShow(true); };
    const win = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, trigger, { once: true, passive: true }));
    const id = typeof win.requestIdleCallback === "function"
      ? win.requestIdleCallback(trigger, { timeout: 10000 })
      : window.setTimeout(trigger, 10000);
    return () => {
      cancelled = true;
      events.forEach((e) => window.removeEventListener(e, trigger));
      if (typeof id === "number") clearTimeout(id);
    };
  }, []);
  if (!show) return null;
  return (
    <Suspense fallback={null}>
      <ChatWidget />
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signin" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/signup/doctor" element={<DoctorSignup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/email-confirmed" element={<EmailConfirmed />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/call/:appointmentId" element={<CallPage />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/doctors/:id" element={<DoctorDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/doctor-benefits" element={<DoctorBenefits />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/dependent-invite" element={<DependentInvite />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <DeferredChatWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
