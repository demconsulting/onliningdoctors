import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, ShieldX, MapPin, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DoctorRow {
  id: string;
  profile_id: string;
  license_number: string | null;
  title: string | null;
  is_verified: boolean;
  is_available: boolean | null;
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
  const { toast } = useToast();

  const fetchDoctors = async () => {
    const { data, error } = await supabase
      .from("doctors")
      .select("id, profile_id, license_number, title, is_verified, is_available, created_at, profile:profiles!doctors_profile_id_fkey(full_name, country, phone)")
      .order("created_at", { ascending: false });

    if (data) setDoctors(data as unknown as DoctorRow[]);
    if (error) console.error(error);
    setLoading(false);
  };

  useEffect(() => { fetchDoctors(); }, []);

  const handleVerify = async (doctorId: string, verify: boolean) => {
    setUpdating(doctorId);
    const { error } = await supabase
      .from("doctors")
      .update({ is_verified: verify, is_available: verify })
      .eq("id", doctorId);

    if (error) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } else {
      toast({ title: verify ? "Doctor verified" : "Doctor unverified" });
      fetchDoctors();
    }
    setUpdating(null);
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const pending = doctors.filter(d => !d.is_verified);
  const verified = doctors.filter(d => d.is_verified);

  return (
    <div className="space-y-6">
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
                    <th className="pb-2 pr-4">Phone</th>
                    <th className="pb-2 pr-4">Applied</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pending.map((d) => (
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
                        {d.license_number ? (
                          <span className="flex items-center gap-1"><FileText className="h-3 w-3 text-muted-foreground" />{d.license_number}</span>
                        ) : (
                          <Badge variant="destructive" className="text-xs">Missing</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4">{d.profile?.phone || "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleVerify(d.id, true)}
                            disabled={updating === d.id || !d.profile?.country}
                            title={!d.profile?.country ? "Country is required before approval" : "Approve doctor"}
                          >
                            {updating === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Approve"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {verified.map((d) => (
                    <tr key={d.id} className="text-foreground">
                      <td className="py-3 pr-4 font-medium">{d.profile?.full_name || "—"}</td>
                      <td className="py-3 pr-4">{d.title || "—"}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {d.profile?.country || "—"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">{d.license_number || "—"}</td>
                      <td className="py-3 pr-4"><Badge className="bg-green-600/10 text-green-600 border-green-600/20">Verified</Badge></td>
                      <td className="py-3">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleVerify(d.id, false)}
                          disabled={updating === d.id}
                        >
                          {updating === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Revoke"}
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
    </div>
  );
};

export default AdminDoctorVerification;
