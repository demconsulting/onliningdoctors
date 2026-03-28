import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ShieldCheck, ShieldX, ShieldBan, MapPin, FileText, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DoctorRow {
  id: string;
  profile_id: string;
  license_number: string | null;
  license_document_path: string | null;
  title: string | null;
  is_verified: boolean;
  is_available: boolean | null;
  is_suspended: boolean;
  suspension_reason: string | null;
  created_at: string;
  profile: {
    full_name: string | null;
    country: string | null;
    phone: string | null;
  } | null;
}

const AdminDoctorVerification = () => {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [suspendDialog, setSuspendDialog] = useState<{ doctor: DoctorRow } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const { toast } = useToast();

  const viewLicenseDoc = async (path: string) => {
    const { data } = await supabase.storage.from("doctor-licenses").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast({ variant: "destructive", title: "Could not load license document" });
  };

  const fetchDoctors = async () => {
    const { data, error } = await supabase
      .from("doctors")
      .select("id, profile_id, license_number, license_document_path, title, is_verified, is_available, is_suspended, suspension_reason, created_at, profile:profiles!doctors_profile_id_fkey(full_name, country, phone)")
      .order("created_at", { ascending: false });

    if (data) setDoctors(data as unknown as DoctorRow[]);
    if (error) console.error(error);
    setLoading(false);
  };

  useEffect(() => { fetchDoctors(); }, []);

  const handleVerify = async (doctorId: string, profileId: string, verify: boolean) => {
    setUpdating(doctorId);
    const { error } = await supabase
      .from("doctors")
      .update({ is_verified: verify, is_available: verify })
      .eq("id", doctorId);

    if (error) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } else {
      toast({ title: verify ? "Doctor verified" : "Doctor unverified" });
      try {
        await supabase.functions.invoke("send-doctor-email", {
          body: { doctorProfileId: profileId, verified: verify },
        });
      } catch (emailErr) {
        console.error("Email notification failed:", emailErr);
      }
      fetchDoctors();
    }
    setUpdating(null);
  };

  const handleSuspend = async () => {
    if (!suspendDialog || !suspendReason.trim()) {
      toast({ variant: "destructive", title: "Please provide a reason for suspension" });
      return;
    }
    const { doctor } = suspendDialog;
    setUpdating(doctor.id);

    const { error } = await supabase
      .from("doctors")
      .update({ is_suspended: true, is_available: false, suspension_reason: suspendReason.trim() })
      .eq("id", doctor.id);

    if (error) {
      toast({ variant: "destructive", title: "Suspension failed", description: error.message });
      setUpdating(null);
      return;
    }

    // Send notification to the doctor
    await supabase.from("notifications").insert({
      user_id: doctor.profile_id,
      title: "Account Suspended",
      message: `Your account has been suspended. Reason: ${suspendReason.trim()}`,
      type: "moderation",
      link: "/doctor",
    });

    toast({ title: "Doctor suspended", description: `${doctor.profile?.full_name} has been suspended.` });
    setSuspendDialog(null);
    setSuspendReason("");
    setUpdating(null);
    fetchDoctors();
  };

  const handleUnsuspend = async (doctor: DoctorRow) => {
    setUpdating(doctor.id);
    const { error } = await supabase
      .from("doctors")
      .update({ is_suspended: false, is_available: true, suspension_reason: null })
      .eq("id", doctor.id);

    if (error) {
      toast({ variant: "destructive", title: "Failed to unsuspend", description: error.message });
      setUpdating(null);
      return;
    }

    // Notify doctor of reinstatement
    await supabase.from("notifications").insert({
      user_id: doctor.profile_id,
      title: "Account Reinstated",
      message: "Your account has been reinstated. You are now visible to patients again.",
      type: "moderation",
      link: "/doctor",
    });

    toast({ title: "Doctor reinstated", description: `${doctor.profile?.full_name} has been reinstated.` });
    setUpdating(null);
    fetchDoctors();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const pending = doctors.filter(d => !d.is_verified && !d.is_suspended);
  const verified = doctors.filter(d => d.is_verified && !d.is_suspended);
  const suspended = doctors.filter(d => d.is_suspended);

  const renderDoctorRow = (d: DoctorRow, actions: React.ReactNode) => (
    <tr key={d.id} className="text-foreground">
      <td className="py-3 pr-4 font-medium">{d.profile?.full_name || "—"}</td>
      <td className="py-3 pr-4">{d.title || "—"}</td>
      <td className="py-3 pr-4">
        {d.profile?.country ? (
          <Badge variant="outline" className="gap-1">
            <MapPin className="h-3 w-3" />
            {d.profile.country}
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-xs">Missing</Badge>
        )}
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          {d.license_number ? (
            <>
              <span className="flex items-center gap-1"><FileText className="h-3 w-3 text-muted-foreground" />{d.license_number}</span>
              {d.license_document_path && (
                <Button size="sm" variant="ghost" className="h-6 px-2 gap-1 text-xs" onClick={() => viewLicenseDoc(d.license_document_path!)}>
                  <Eye className="h-3 w-3" /> View
                </Button>
              )}
            </>
          ) : (
            <Badge variant="destructive" className="text-xs">Missing</Badge>
          )}
        </div>
      </td>
      <td className="py-3">{actions}</td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Pending Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Pending Verification ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No doctors awaiting verification.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Title</th>
                    <th className="pb-2 pr-4">Country</th>
                    <th className="pb-2 pr-4">License #</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pending.map((d) =>
                    renderDoctorRow(d, (
                      <Button
                        size="sm"
                        onClick={() => handleVerify(d.id, d.profile_id, true)}
                        disabled={updating === d.id || !d.profile?.country}
                        title={!d.profile?.country ? "Country is required before approval" : "Approve doctor"}
                      >
                        {updating === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Approve"}
                      </Button>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verified Doctors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            Verified Doctors ({verified.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {verified.length === 0 ? (
            <p className="text-sm text-muted-foreground">No verified doctors yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Title</th>
                    <th className="pb-2 pr-4">Country</th>
                    <th className="pb-2 pr-4">License #</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {verified.map((d) =>
                    renderDoctorRow(d, (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => { setSuspendDialog({ doctor: d }); setSuspendReason(""); }}
                          disabled={updating === d.id}
                        >
                          <ShieldBan className="mr-1 h-3 w-3" /> Suspend
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleVerify(d.id, d.profile_id, false)}
                          disabled={updating === d.id}
                        >
                          {updating === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Revoke"}
                        </Button>
                      </div>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspended Doctors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <ShieldBan className="h-5 w-5 text-destructive" />
            Suspended Doctors ({suspended.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suspended.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suspended doctors.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Title</th>
                    <th className="pb-2 pr-4">Country</th>
                    <th className="pb-2 pr-4">Reason</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {suspended.map((d) => (
                    <tr key={d.id} className="text-foreground">
                      <td className="py-3 pr-4 font-medium">{d.profile?.full_name || "—"}</td>
                      <td className="py-3 pr-4">{d.title || "—"}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {d.profile?.country || "—"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 max-w-xs">
                        <p className="text-sm text-muted-foreground line-clamp-2">{d.suspension_reason || "No reason provided"}</p>
                      </td>
                      <td className="py-3">
                        <Button
                          size="sm"
                          onClick={() => handleUnsuspend(d)}
                          disabled={updating === d.id}
                        >
                          {updating === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reinstate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspend Dialog */}
      <Dialog open={!!suspendDialog} onOpenChange={(open) => { if (!open) setSuspendDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend {suspendDialog?.doctor.profile?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This doctor will be hidden from patients and notified of the suspension with the reason you provide.
            </p>
            <div>
              <Label>Reason for Suspension</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Explain why this doctor is being suspended..."
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSuspendDialog(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleSuspend}
                disabled={!suspendReason.trim() || updating === suspendDialog?.doctor.id}
              >
                {updating === suspendDialog?.doctor.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ShieldBan className="mr-1 h-4 w-4" />}
                Suspend Doctor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDoctorVerification;
