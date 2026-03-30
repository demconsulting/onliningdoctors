import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Download, Eye } from "lucide-react";
import { format } from "date-fns";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PrescriptionViewProps {
  appointmentId: string;
  viewAs: "doctor" | "patient";
}

const PrescriptionView = ({ appointmentId, viewAs }: PrescriptionViewProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prescription, setPrescription] = useState<any>(null);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [logoSignedUrl, setLogoSignedUrl] = useState("");
  const [sigSignedUrl, setSigSignedUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("prescriptions" as any)
        .select("*")
        .eq("appointment_id", appointmentId)
        .maybeSingle();

      if (data) {
        const rx = data as any;
        setPrescription(rx);

        // Load profiles
        const [docRes, patRes] = await Promise.all([
          supabase.from("profiles").select("full_name, phone, city, state, country, address").eq("id", rx.doctor_id).single(),
          supabase.from("profiles").select("full_name, phone, date_of_birth, gender").eq("id", rx.patient_id).single(),
        ]);
        setDoctorProfile(docRes.data);
        setPatientProfile(patRes.data);

        // Load doctor details including practice fields
        const { data: docDetail } = await supabase
          .from("doctors")
          .select("title, license_number, specialty_id, hospital_affiliation, education, practice_name, practice_email, practice_phone, practice_logo_url")
          .eq("profile_id", rx.doctor_id)
          .single();
        if (docDetail) setDoctorProfile((prev: any) => ({ ...prev, ...docDetail }));

        // Get signed URLs for logo/signature — prefer practice_logo_url from doctor record
        const logoPath = (docDetail as any)?.practice_logo_url || rx.doctor_logo_url;
        if (logoPath) {
          const { data: url } = await supabase.storage.from("prescription-assets").createSignedUrl(logoPath, 3600);
          if (url) setLogoSignedUrl(url.signedUrl);
        }
        if (rx.doctor_signature_url) {
          const { data: url } = await supabase.storage.from("prescription-assets").createSignedUrl(rx.doctor_signature_url, 3600);
          if (url) setSigSignedUrl(url.signedUrl);
        }
      }
      setLoading(false);
    };
    load();
  }, [open, appointmentId]);

  const handlePdfDownload = async () => {
    if (!printRef.current) return;
    setGenerating(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: `prescription_${format(new Date(prescription.created_at), "yyyy-MM-dd")}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(printRef.current)
        .save();
    } catch {
      // silently fail
    } finally {
      setGenerating(false);
    }
  };

  if (!prescription && !open) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Eye className="h-3.5 w-3.5" /> View Prescription
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Prescription</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground text-center py-6">No prescription found for this appointment.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Eye className="h-3.5 w-3.5" /> View Prescription
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Prescription
            </DialogTitle>
            {prescription && (
              <Button variant="outline" size="sm" onClick={handlePdfDownload} disabled={generating} className="gap-1.5">
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Download PDF
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !prescription ? (
          <p className="text-sm text-muted-foreground text-center py-6">No prescription found for this appointment.</p>
        ) : (
          <div ref={printRef} className="bg-white text-black p-6 rounded-lg" style={{ fontFamily: "Georgia, serif" }}>
            {/* Header with Logo */}
            <div className="flex items-start justify-between border-b-2 border-primary pb-4 mb-4">
              <div className="flex items-start gap-4">
                {logoSignedUrl && (
                  <img src={logoSignedUrl} alt="Practice Logo" className="h-16 w-auto object-contain" crossOrigin="anonymous" />
                )}
                <div>
                  {doctorProfile?.practice_name && (
                    <h2 className="text-lg font-bold text-gray-900 mb-0.5">{doctorProfile.practice_name}</h2>
                  )}
                  <p className="text-base font-semibold text-gray-800">
                    {doctorProfile?.title ? `${doctorProfile.title} ` : "Dr. "}{doctorProfile?.full_name || ""}
                  </p>
                  {doctorProfile?.education && <p className="text-xs text-gray-600">{doctorProfile.education}</p>}
                  {doctorProfile?.hospital_affiliation && <p className="text-xs text-gray-600">{doctorProfile.hospital_affiliation}</p>}
                  {doctorProfile?.license_number && <p className="text-xs text-gray-500">License: {doctorProfile.license_number}</p>}
                  {doctorProfile?.address && <p className="text-xs text-gray-500">{doctorProfile.address}</p>}
                  {(doctorProfile?.city || doctorProfile?.state || doctorProfile?.country) && (
                    <p className="text-xs text-gray-500">
                      {[doctorProfile?.city, doctorProfile?.state, doctorProfile?.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {(doctorProfile?.practice_phone || doctorProfile?.phone) && (
                    <p className="text-xs text-gray-500">Tel: {doctorProfile.practice_phone || doctorProfile.phone}</p>
                  )}
                  {doctorProfile?.practice_email && (
                    <p className="text-xs text-gray-500">Email: {doctorProfile.practice_email}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold tracking-wider text-primary/80" style={{ fontFamily: "monospace" }}>℞</div>
                <p className="text-xs text-gray-500 mt-1">Date: {format(new Date(prescription.created_at), "dd MMM yyyy")}</p>
              </div>
            </div>

            {/* Patient Info */}
            <div className="bg-gray-50 rounded p-3 mb-4 grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-semibold">Patient:</span> {patientProfile?.full_name || "—"}</div>
              <div><span className="font-semibold">Gender:</span> {patientProfile?.gender || "—"}</div>
              {patientProfile?.date_of_birth && (
                <div><span className="font-semibold">DOB:</span> {format(new Date(patientProfile.date_of_birth), "dd MMM yyyy")}</div>
              )}
              {prescription.allergies_noted && (
                <div className="col-span-2">
                  <span className="font-semibold text-red-600">⚠ Allergies:</span>{" "}
                  <span className="text-red-600">{prescription.allergies_noted}</span>
                </div>
              )}
            </div>

            {/* Diagnosis */}
            {prescription.diagnosis && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm border-b border-gray-200 pb-1 mb-2">Diagnosis</h3>
                <p className="text-sm">{prescription.diagnosis}</p>
              </div>
            )}

            {/* Medications Table */}
            <div className="mb-4">
              <h3 className="font-semibold text-sm border-b border-gray-200 pb-1 mb-2">Medications</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border border-gray-200">#</th>
                    <th className="text-left p-2 border border-gray-200">Medication</th>
                    <th className="text-left p-2 border border-gray-200">Dosage</th>
                    <th className="text-left p-2 border border-gray-200">Frequency</th>
                    <th className="text-left p-2 border border-gray-200">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {(prescription.medications as Medication[]).map((med, i) => (
                    <tr key={i}>
                      <td className="p-2 border border-gray-200">{i + 1}</td>
                      <td className="p-2 border border-gray-200 font-medium">{med.name}</td>
                      <td className="p-2 border border-gray-200">{med.dosage || "—"}</td>
                      <td className="p-2 border border-gray-200">{med.frequency || "—"}</td>
                      <td className="p-2 border border-gray-200">{med.duration || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(prescription.medications as Medication[]).some(m => m.instructions) && (
                <div className="mt-2 space-y-1">
                  {(prescription.medications as Medication[]).filter(m => m.instructions).map((m, i) => (
                    <p key={i} className="text-xs text-gray-600 italic">
                      <span className="font-medium">{m.name}:</span> {m.instructions}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Warnings */}
            {prescription.warnings && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
                <h3 className="font-semibold text-sm text-red-700 mb-1">⚠ Warnings / Side Effects</h3>
                <p className="text-sm text-red-600">{prescription.warnings}</p>
              </div>
            )}

            {/* Pharmacy Notes */}
            {prescription.pharmacy_notes && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm border-b border-gray-200 pb-1 mb-2">Pharmacy Notes</h3>
                <p className="text-sm">{prescription.pharmacy_notes}</p>
              </div>
            )}

            {/* Refill & Follow-up */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div><span className="font-semibold">Refills:</span> {prescription.refill_count || 0}</div>
              {prescription.follow_up_date && (
                <div><span className="font-semibold">Follow-up:</span> {format(new Date(prescription.follow_up_date), "dd MMM yyyy")}</div>
              )}
            </div>

            {/* Signature */}
            <div className="border-t-2 border-gray-200 pt-4 flex items-end justify-between">
              <div>
                {sigSignedUrl && (
                  <img src={sigSignedUrl} alt="Doctor Signature" className="h-12 w-auto object-contain mb-1" crossOrigin="anonymous" />
                )}
                <div className="border-t border-gray-400 pt-1 min-w-[200px]">
                  <p className="text-sm font-semibold">
                    {doctorProfile?.title ? `${doctorProfile.title} ` : "Dr. "}{doctorProfile?.full_name || ""}
                  </p>
                  <p className="text-xs text-gray-500">Authorized Prescriber</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">Generated on {format(new Date(), "dd MMM yyyy, HH:mm")}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionView;
