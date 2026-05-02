import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
// Lazy-load the floating chat widget AND defer mounting it until the browser
// is idle (or the user interacts), so its framer-motion + supabase realtime
// payload never blocks first paint or LCP on the landing page.
const ChatWidget = lazy(() => import("./components/chat/ChatWidget"));
import Index from "./pages/Index";

// Code-split: load route bundles only when navigated to.
// Keeps the landing page (Index) bundle small and improves LCP.
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const DoctorSignup = lazy(() => import("./pages/DoctorSignup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
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

// Sensible defaults: avoid duplicate background refetches that thrash the
// network on slow mobile connections. Components can override per-query.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,         // 1 min — most lists don't change that fast
      gcTime: 5 * 60_000,        // keep cache 5 min for back-nav snap
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

import { Skeleton } from "@/components/ui/skeleton";

const RouteFallback = () => (
  <div
    className="min-h-screen flex flex-col"
    role="status"
    aria-live="polite"
    aria-label="Loading page"
  >
    {/* Navbar skeleton — matches the real navbar height to avoid layout shift */}
    <div className="h-16 border-b flex items-center px-4 gap-4">
      <Skeleton className="h-8 w-32" />
      <div className="ml-auto flex gap-3">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
    {/* Page body skeleton */}
    <div className="flex-1 container mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-10 w-2/3 max-w-md" />
      <Skeleton className="h-4 w-1/2 max-w-sm" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
    <span className="sr-only">Loading…</span>
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
      ? win.requestIdleCallback(trigger, { timeout: 4000 })
      : window.setTimeout(trigger, 3500);
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
            <Route path="/signup" element={<Signup />} />
            <Route path="/signup/doctor" element={<DoctorSignup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
