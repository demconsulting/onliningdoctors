import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";

// Recover from stale chunk hashes after a redeploy: if a dynamic import
// fails (old index.html cached, new chunks have different hashes), force a
// one-time reload so the browser fetches the fresh manifest.
const lazyWithRetry = <T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) =>
  lazy(async () => {
    const KEY = "lovable:chunk-reload";
    try {
      return await factory();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isChunkErr =
        /Importing a module script failed|Failed to fetch dynamically imported module|ChunkLoadError|error loading dynamically imported module/i.test(
          msg,
        );
      if (isChunkErr && typeof window !== "undefined" && !sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, "1");
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });

// Lazy-load the floating chat widget AND defer mounting it until the user
// interacts or the page has settled, so its framer-motion + realtime payload
// never competes with homepage LCP.
const ChatWidget = lazyWithRetry(() => import("./components/chat/ChatWidget"));
import Index from "./pages/Index";

// Code-split: load route bundles only when navigated to.
// Keeps the landing page (Index) bundle small and improves LCP.
const Login = lazyWithRetry(() => import("./pages/Login"));
const Signup = lazyWithRetry(() => import("./pages/Signup"));
const DoctorSignup = lazyWithRetry(() => import("./pages/DoctorSignup"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const AuthCallback = lazyWithRetry(() => import("./pages/AuthCallback"));
const EmailConfirmed = lazyWithRetry(() => import("./pages/EmailConfirmed"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const DoctorDashboard = lazyWithRetry(() => import("./pages/DoctorDashboard"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const CallPage = lazyWithRetry(() => import("./pages/CallPage"));
const About = lazyWithRetry(() => import("./pages/About"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const DoctorBenefits = lazyWithRetry(() => import("./pages/DoctorBenefits"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const RefundPolicy = lazyWithRetry(() => import("./pages/RefundPolicy"));
const Doctors = lazyWithRetry(() => import("./pages/Doctors"));
const DoctorDetail = lazyWithRetry(() => import("./pages/DoctorDetail"));
const DependentInvite = lazyWithRetry(() => import("./pages/DependentInvite"));
const PracticeSetup = lazyWithRetry(() => import("./pages/PracticeSetup"));
const PracticeTeam = lazyWithRetry(() => import("./pages/PracticeTeam"));
const PracticeSettings = lazyWithRetry(() => import("./pages/PracticeSettings"));
const WellnessPlus = lazyWithRetry(() => import("./pages/WellnessPlus"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

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
            <Route path="/practice/setup" element={<PracticeSetup />} />
            <Route path="/practice/team" element={<PracticeTeam />} />
            <Route path="/practice/settings" element={<PracticeSettings />} />
            <Route path="/wellness-plus" element={<WellnessPlus />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <DeferredChatWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
