import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Download, Eye, Mail, Ban, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface PrescriptionViewProps {
  appointmentId?: string;
  prescriptionId?: string;
  viewAs: "doctor" | "patient";
  triggerLabel?: string;
  onChanged?: () => void;
}

const PrescriptionView = ({ appointmentId, prescriptionId, viewAs, triggerLabel = "View Prescription", onChanged }: PrescriptionViewProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prescription, setPrescription] = useState<any>(null);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [logoSignedUrl, setLogoSignedUrl] = useState("");
  const [sigSignedUrl, setSigSignedUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const verifyUrl = useMemo(() => {
    if (!prescription?.verification_token) return "";
    return `${window.location.origin}/verify-prescription?token=${prescription.verification_token}`;
  }, [prescription]);

  const qrUrl = verifyUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`
    : "";

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      let query = supabase.from("prescriptions" as any).select("*");
      if (prescriptionId) query = query.eq("id", prescriptionId);
      else if (appointmentId) query = query.eq("appointment_id", appointmentId);
      const { data } = await query.maybeSingle();

      if (data) {
        const rx = data as any;
        setPrescription(rx);

        const [docRes, patRes] = await Promise.all([
          supabase.from("profiles").select("full_name, phone, city, state, country, address").eq("id", rx.doctor_id).single(),
          supabase.from("profiles").select("full_name, phone, date_of_birth, gender").eq("id", rx.patient_id).single(),
        ]);
        setDoctorProfile(docRes.data);
        setPatientProfile(patRes.data);
        setEmailTo("");

        const { data: docDetail } = await supabase
          .from("doctors")
          .select("title, license_number, education, practice_name, practice_email, practice_phone, practice_logo_url, practice_signature_url, practice_address, practice_website")
          .eq("profile_id", rx.doctor_id)
          .single();
        if (docDetail) setDoctorProfile((prev: any) => ({ ...prev, ...docDetail }));

        // Lookup patient email
        const { data: { user: _u } } = await supabase.auth.getUser();
        const { data: appt } = await supabase.from("appointments").select("patient_email").eq("id", rx.appointment_id).maybeSingle();
        if (appt?.patient_email) setEmailTo(appt.patient_email);

        const logoPath = (docDetail as any)?.practice_logo_url || rx.doctor_logo_url;
        if (logoPath) {
          const { data: url } = await supabase.storage.from("prescription-assets").createSignedUrl(logoPath, 3600);
          if (url) setLogoSignedUrl(url.signedUrl);
        }
        const sigPath = (docDetail as any)?.practice_signature_url || rx.doctor_signature_url;
        if (sigPath) {
          const { data: url } = await supabase.storage.from("prescription-assets").createSignedUrl(sigPath, 3600);
          if (url) setSigSignedUrl(url.signedUrl);
        }
      }
      setLoading(false);
    };
    load();
  }, [open, appointmentId, prescriptionId]);

  const handlePdfDownload = async () => {
    if (!printRef.current) return;
    setGenerating(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: `${prescription.prescription_number || "prescription"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(printRef.current)
        .save();
    } catch {
      toast({ variant: "destructive", title: "PDF generation failed" });
    } finally {
      setGenerating(false);
    }
  };

  const sendEmail = async () => {
    if (!emailTo.trim()) { toast({ variant: "destructive", title: "Email required" }); return; }
    setSendingEmail(true);
    const { error } = await supabase.functions.invoke("send-prescription-email", {
      body: {
        prescriptionId: prescription.id,
        to: emailTo.trim(),
        verifyUrl,
      },
    });
    setSendingEmail(false);
    if (error) toast({ variant: "destructive", title: "Could not send email", description: error.message });
    else { toast({ title: "Prescription emailed to patient" }); setEmailOpen(false); }
  };

  const cancelPrescription = async () => {
    if (!cancelReason.trim()) { toast({ variant: "destructive", title: "Reason required" }); return; }
    setCancelling(true);
    const { error } = await supabase.from("prescriptions" as any)
      .update({ status: "cancelled", cancellation_reason: cancelReason.trim() })
      .eq("id", prescription.id);
    setCancelling(false);
    if (error) toast({ variant: "destructive", title: "Cancel failed", description: error.message });
    else {
      toast({ title: "Prescription cancelled" });
      setCancelOpen(false);
      setPrescription({ ...prescription, status: "cancelled", cancellation_reason: cancelReason.trim() });
      onChanged?.();
    }
  };

  const isDoctor = viewAs === "doctor";
  const meds = (prescription?.medications as any[]) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Eye className="h-3.5 w-3.5" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Prescription
              {prescription?.status === "cancelled" && <Badge variant="destructive" className="ml-2">Cancelled</Badge>}
            </DialogTitle>
            {prescription && (
              <div className="flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" onClick={handlePdfDownload} disabled={generating} className="gap-1.5">
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} PDF
                </Button>
                {isDoctor && prescription.status !== "cancelled" && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)} className="gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)} className="gap-1.5 text-destructive border-destructive/30">
                      <Ban className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !prescription ? (
          <p className="text-sm text-muted-foreground text-center py-6">No prescription found.</p>
        ) : (
          <div ref={printRef} className="bg-white text-black p-8 rounded-lg" style={{ fontFamily: "Georgia, serif" }}>
            {prescription.status === "cancelled" && (
              <div className="mb-3 rounded border-2 border-red-300 bg-red-50 p-2 text-center text-sm font-bold text-red-700 uppercase tracking-wider">
                Cancelled {prescription.cancellation_reason ? `— ${prescription.cancellation_reason}` : ""}
              </div>
            )}

            <div className="flex items-start justify-between border-b-2 border-primary pb-4 mb-4">
              <div className="flex items-start gap-4">
                {logoSignedUrl && <img src={logoSignedUrl} alt="Logo" className="h-16 w-auto object-contain" crossOrigin="anonymous" />}
                <div>
                  {doctorProfile?.practice_name && <h2 className="text-lg font-bold text-gray-900 mb-0.5">{doctorProfile.practice_name}</h2>}
                  <p className="text-base font-semibold text-gray-800">
                    {doctorProfile?.title || "Dr."} {doctorProfile?.full_name || ""}
                  </p>
                  {doctorProfile?.education && <p className="text-xs text-gray-600">{doctorProfile.education}</p>}
                  {doctorProfile?.license_number && <p className="text-xs text-gray-500">HPCSA: {doctorProfile.license_number}</p>}
                  {doctorProfile?.practice_address && <p className="text-xs text-gray-500 whitespace-pre-line">{doctorProfile.practice_address}</p>}
                  {doctorProfile?.practice_phone && <p className="text-xs text-gray-500">Tel: {doctorProfile.practice_phone}</p>}
                  {doctorProfile?.practice_email && <p className="text-xs text-gray-500">Email: {doctorProfile.practice_email}</p>}
                  {doctorProfile?.practice_website && <p className="text-xs text-gray-500">Web: {doctorProfile.practice_website}</p>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold tracking-wider text-primary/80" style={{ fontFamily: "monospace" }}>℞</div>
                <p className="text-xs text-gray-500 mt-1">Date: {format(new Date(prescription.created_at), "dd MMM yyyy")}</p>
                {prescription.prescription_number && (
                  <p className="text-xs text-gray-600 mt-0.5 font-mono">{prescription.prescription_number}</p>
                )}
              </div>
            </div>

            {/* Patient Info */}
            <div className="bg-gray-50 rounded p-3 mb-4 grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-semibold">Patient:</span> {patientProfile?.full_name || "—"}</div>
              <div><span className="font-semibold">Gender:</span> {patientProfile?.gender || "—"}</div>
              {patientProfile?.date_of_birth && (
                <div><span className="font-semibold">DOB:</span> {format(new Date(patientProfile.date_of_birth), "dd MMM yyyy")}</div>
              )}
              <div><span className="font-semibold">Consult Date:</span> {format(new Date(prescription.created_at), "dd MMM yyyy")}</div>
              {prescription.allergies_noted && (
                <div className="col-span-2"><span className="font-semibold text-red-600">⚠ Allergies:</span>{" "}
                  <span className="text-red-600">{prescription.allergies_noted}</span></div>
              )}
            </div>

            {prescription.diagnosis && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm border-b border-gray-200 pb-1 mb-2">Diagnosis</h3>
                <p className="text-sm">{prescription.diagnosis}</p>
              </div>
            )}

            {prescription.clinical_notes && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm border-b border-gray-200 pb-1 mb-2">Clinical Notes</h3>
                <p className="text-sm whitespace-pre-line">{prescription.clinical_notes}</p>
              </div>
            )}

            <div className="mb-4">
              <h3 className="font-semibold text-sm border-b border-gray-200 pb-1 mb-2">Medications</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border border-gray-200">#</th>
                    <th className="text-left p-2 border border-gray-200">Medication</th>
                    <th className="text-left p-2 border border-gray-200">Strength</th>
                    <th className="text-left p-2 border border-gray-200">Dosage</th>
                    <th className="text-left p-2 border border-gray-200">Qty</th>
                    <th className="text-left p-2 border border-gray-200">Duration</th>
                    <th className="text-left p-2 border border-gray-200">Rpt</th>
                  </tr>
                </thead>
                <tbody>
                  {meds.map((m, i) => (
                    <tr key={i}>
                      <td className="p-2 border border-gray-200">{i + 1}</td>
                      <td className="p-2 border border-gray-200 font-medium">{m.name}</td>
                      <td className="p-2 border border-gray-200">{m.strength || m.dosage || "—"}</td>
                      <td className="p-2 border border-gray-200">{m.frequency || "—"}</td>
                      <td className="p-2 border border-gray-200">{m.quantity || "—"}</td>
                      <td className="p-2 border border-gray-200">{m.duration || "—"}</td>
                      <td className="p-2 border border-gray-200">{m.repeats || "0"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {meds.some((m: any) => m.instructions) && (
                <div className="mt-2 space-y-1">
                  {meds.filter((m: any) => m.instructions).map((m: any, i: number) => (
                    <p key={i} className="text-xs text-gray-600 italic">
                      <span className="font-medium">{m.name}:</span> {m.instructions}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {prescription.warnings && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
                <h3 className="font-semibold text-sm text-red-700 mb-1">⚠ Warnings / Side Effects</h3>
                <p className="text-sm text-red-600">{prescription.warnings}</p>
              </div>
            )}

            {prescription.pharmacy_notes && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm border-b border-gray-200 pb-1 mb-2">Pharmacy Notes</h3>
                <p className="text-sm">{prescription.pharmacy_notes}</p>
              </div>
            )}

            {prescription.follow_up_instructions && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm border-b border-gray-200 pb-1 mb-2">Follow-up Instructions</h3>
                <p className="text-sm whitespace-pre-line">{prescription.follow_up_instructions}</p>
              </div>
            )}

            {prescription.follow_up_date && (
              <div className="mb-4 text-sm">
                <span className="font-semibold">Follow-up appointment:</span> {format(new Date(prescription.follow_up_date), "dd MMM yyyy")}
              </div>
            )}

            {/* Signature & Verification footer */}
            <div className="border-t-2 border-gray-200 pt-4 mt-6 flex items-end justify-between gap-4">
              <div className="flex-1">
                {sigSignedUrl && <img src={sigSignedUrl} alt="Signature" className="h-12 w-auto object-contain mb-1" crossOrigin="anonymous" />}
                <div className="border-t border-gray-400 pt-1 min-w-[200px]">
                  <p className="text-sm font-semibold">{doctorProfile?.title || "Dr."} {doctorProfile?.full_name || ""}</p>
                  <p className="text-xs text-gray-500">{doctorProfile?.education || ""}</p>
                  <p className="text-xs text-gray-500">HPCSA: {doctorProfile?.license_number || "—"}</p>
                </div>
              </div>
              {qrUrl && (
                <div className="text-center">
                  <img src={qrUrl} alt="Verify QR" className="h-24 w-24" crossOrigin="anonymous" />
                  <p className="text-[10px] text-gray-500 mt-1">Scan to verify</p>
                  <p className="text-[10px] text-gray-400 font-mono break-all max-w-[120px]">{prescription.verification_token?.slice(0, 8)}</p>
                </div>
              )}
            </div>

            <div className="text-center mt-4 pt-3 border-t border-dashed border-gray-300">
              <p className="text-[10px] text-gray-400">
                Generated securely through Doctors Onlining · {format(new Date(), "dd MMM yyyy, HH:mm")} ·
                {" "}Verify at <span className="font-mono">{verifyUrl}</span>
              </p>
            </div>
          </div>
        )}

        {/* Email dialog */}
        <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Email Prescription to Patient</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label>Patient email</Label>
              <Input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="patient@example.com" />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEmailOpen(false)}>Cancel</Button>
              <Button onClick={sendEmail} disabled={sendingEmail} className="gap-2">
                {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel dialog */}
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Cancel Prescription</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label>Cancellation reason</Label>
              <Textarea rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="e.g. Patient allergy reported after issue..." />
              <p className="text-xs text-muted-foreground">
                This is recorded permanently in the audit log. Cancelled prescriptions can no longer be edited.
              </p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCancelOpen(false)}>Back</Button>
              <Button variant="destructive" onClick={cancelPrescription} disabled={cancelling} className="gap-2">
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Cancel Prescription
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionView;
