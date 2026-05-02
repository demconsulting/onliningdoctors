import { lazy, Suspense, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import VideoCall from "@/components/call/VideoCall";
import ConsultationNotes from "@/components/call/ConsultationNotes";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrescriptionForm = lazy(() => import("@/components/doctor/PrescriptionForm"));

const CallPage = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [remoteUserId, setRemoteUserId] = useState("");
  const [isInitiator, setIsInitiator] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);
  const [doctorId, setDoctorId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [error, setError] = useState("");

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
      if (apt.patient_id !== uid && apt.doctor_id !== uid) { setError("Not authorized"); setLoading(false); return; }
      if (!["confirmed", "completed"].includes(apt.status)) { setError("Appointment must be confirmed to start a call"); setLoading(false); return; }

      const remote = uid === apt.doctor_id ? apt.patient_id : apt.doctor_id;
      setRemoteUserId(remote);
      setIsInitiator(uid === apt.doctor_id);
      setIsDoctor(uid === apt.doctor_id);
      setDoctorId(apt.doctor_id);
      setPatientId(apt.patient_id);
      // Fetch patient name for prescription
      const { data: patProfile } = await supabase.from("profiles").select("full_name").eq("id", apt.patient_id).single();
      setPatientName(patProfile?.full_name || "Patient");
      setLoading(false);
    };
    init();
  }, [appointmentId, navigate]);

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
            />
          </div>
          <div className="lg:col-span-1 space-y-4">
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default CallPage;
