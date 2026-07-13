import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import VideoCall from "@/components/call/VideoCall";
import ConsultationNotes from "@/components/call/ConsultationNotes";
import ConsultationChat from "@/components/call/ConsultationChat";
import DiagnosticsPanel from "@/components/call/DiagnosticsPanel";
import { Loader2, ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DiagnosticsSnapshot } from "@/services/webrtc/types";
import { useConsultationChat } from "@/services/webrtc/useConsultationChat";

const PrescriptionForm = lazy(() => import("@/components/doctor/PrescriptionForm"));

const CallPage = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [remoteUserId, setRemoteUserId] = useState("");
  const [isInitiator, setIsInitiator] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [doctorId, setDoctorId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [localName, setLocalName] = useState("");
  const [remoteName, setRemoteName] = useState("");
  const [error, setError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [sideTab, setSideTab] = useState<"notes" | "chat">("notes");
  const [diagnostics, setDiagnostics] = useState<DiagnosticsSnapshot | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const uid = session.user.id;
      setUserId(uid);

      if (!appointmentId) { setError("No appointment specified"); setLoading(false); return; }

      const { data: apt, error: aptErr } = await supabase
        .from("appointments")
        .select("patient_id, doctor_id, status")
        .eq("id", appointmentId)
        .single();

      if (aptErr || !apt) { setError("Appointment not found"); setLoading(false); return; }

      // Admins can observe the room (they still see diagnostics-only surfaces).
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .in("role", ["admin", "super_admin", "platform_admin"]);
      const admin = !!adminRoles && adminRoles.length > 0;
      setIsAdmin(admin);

      if (apt.patient_id !== uid && apt.doctor_id !== uid && !admin) {
        setError("Not authorized"); setLoading(false); return;
      }
      if (!["confirmed", "completed"].includes(apt.status)) {
        setError("Appointment must be confirmed to start a call"); setLoading(false); return;
      }

      const remote = uid === apt.doctor_id ? apt.patient_id : apt.doctor_id;
      setRemoteUserId(remote);
      setIsInitiator(uid === apt.doctor_id);
      setIsDoctor(uid === apt.doctor_id);
      setDoctorId(apt.doctor_id);
      setPatientId(apt.patient_id);

      const [{ data: patProfile }, { data: docProfile }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", apt.patient_id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", apt.doctor_id).maybeSingle(),
      ]);
      setPatientName(patProfile?.full_name || "Patient");
      const docLabel = docProfile?.full_name ? `Dr. ${docProfile.full_name}` : "Doctor";
      setLocalName(uid === apt.doctor_id ? docLabel : (patProfile?.full_name || "Patient"));
      setRemoteName(uid === apt.doctor_id ? (patProfile?.full_name || "Patient") : docLabel);

      setLoading(false);
    };
    init();
  }, [appointmentId, navigate]);

  const onDiagnostics = useCallback((snap: DiagnosticsSnapshot) => setDiagnostics(snap), []);

  const localRole: "doctor" | "patient" = isDoctor ? "doctor" : "patient";

  const chat = useConsultationChat({
    appointmentId: appointmentId ?? "",
    localUserId: userId,
    localRole,
    visible: chatOpen,
  });

  const diagnosticsWithChat: DiagnosticsSnapshot | null = diagnostics ? {
    ...diagnostics,
    chatSubscriptionStatus: chat.subscriptionStatus,
    chatSubscriptionError: chat.subscriptionError,
  } : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
        </main>
      </div>
    );
  }


  const chatToggleButton = (
    <Button
      variant="outline"
      size="icon"
      onClick={() => {
        if (isMobile) {
          setChatOpen((o) => !o);
          return;
        }
        setSideTab((current) => {
          const next = current === "chat" && chatOpen ? "notes" : "chat";
          setChatOpen(next === "chat");
          return next;
        });
      }}
      className="relative rounded-full h-12 w-12"
      aria-label={chatOpen ? "Close chat" : `Open chat${chat.unread ? `, ${chat.unread} unread` : ""}`}
    >
      <MessageSquare className="h-5 w-5" />
      {chat.unread > 0 && !chatOpen && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
          {chat.unread > 9 ? "9+" : chat.unread}
        </span>
      )}
    </Button>
  );

  const chatView = (
    <ConsultationChat
      messages={chat.messages}
      localUserId={userId}
      localName={localName}
      remoteName={remoteName}
      maxLength={chat.maxLength}
      onSend={chat.send}
      onClose={() => setChatOpen(false)}
    />
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
            Non-emergency consultation only
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <VideoCall
              appointmentId={appointmentId!}
              localUserId={userId}
              remoteUserId={remoteUserId}
              isInitiator={isInitiator}
              onEnd={() => navigate(-1)}
              rightControls={chatToggleButton}
              onDiagnostics={isAdmin ? onDiagnostics : undefined}
            />
            {isAdmin && diagnosticsWithChat && (
              <div className="mt-4">
                <DiagnosticsPanel snapshot={diagnosticsWithChat} />
              </div>
            )}
          </div>

          {/* Desktop: Notes and Chat share the right panel as tabs. Mobile: chat
              opens as a bottom sheet and keeps the call mounted underneath. */}
          <div className="lg:col-span-1 space-y-4">
            <Tabs
              value={sideTab}
              onValueChange={(value) => {
                const next = value as "notes" | "chat";
                setSideTab(next);
                setChatOpen(next === "chat");
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="notes">Consultation Notes</TabsTrigger>
                <TabsTrigger value="chat" className="relative">
                  Chat
                  {chat.unread > 0 && sideTab !== "chat" && (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                      {chat.unread > 9 ? "9+" : chat.unread}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="notes" className="space-y-4">
                <ConsultationNotes
                  appointmentId={appointmentId!}
                  doctorId={doctorId}
                  isDoctor={isDoctor}
                />
                {isDoctor && (
                  <div className="flex gap-2">
                    <Suspense fallback={null}>
                      <PrescriptionForm
                        appointmentId={appointmentId!}
                        doctorId={doctorId}
                        patientId={patientId}
                        patientName={patientName}
                      />
                    </Suspense>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="chat" className="h-[600px]">
                {chatView}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Mobile chat drawer — full-height sheet that keeps the video mounted. */}
      {isMobile && (
        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle className="text-left">Consultation chat</SheetTitle>
            </SheetHeader>
            <div className="flex-1 min-h-0 px-4 pb-4">
              {chatView}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default CallPage;
