import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePractice } from "@/hooks/usePractice";
import type { User } from "@supabase/supabase-js";

const PracticeSettings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const { practice, myMember, isManager, loading, refresh } = usePractice(user?.id);
  const [form, setForm] = useState({
    practice_name: "", email: "", phone: "", address: "",
    nurses_can_support_consultations: false, is_active: true,
    bhf_number: "", is_medical_aid_practice: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login");
      else setUser(session.user);
    });
  }, [navigate]);

  useEffect(() => {
    if (practice) setForm({
      practice_name: practice.practice_name,
      email: practice.email,
      phone: practice.phone,
      address: practice.address,
      nurses_can_support_consultations: practice.nurses_can_support_consultations,
      is_active: practice.is_active,
      bhf_number: practice.bhf_number || "",
      is_medical_aid_practice: practice.is_medical_aid_practice,
    });
  }, [practice]);

  const isOwner = myMember?.role === "owner";

  useEffect(() => {
    if (user && !loading && !practice) navigate("/practice/setup", { replace: true });
  }, [user, loading, practice, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practice || !isManager) return;
    if (form.bhf_number.trim().length > 50) { toast.error("BHF number must be 50 characters or fewer"); return; }
    setSaving(true);
    const { error } = await supabase.from("practices").update({ ...form, bhf_number: form.bhf_number.trim() || null }).eq("id", practice.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Settings saved");
    refresh();
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!practice) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-2 font-display text-3xl font-bold">My Practice &amp; Medical Aid</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {practice.practice_name} · #{practice.practice_number}
          </p>
          <form onSubmit={handleSave} className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Practice details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Practice name</Label><Input disabled={!isManager} value={form.practice_name} onChange={(e) => setForm({ ...form, practice_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input disabled={!isManager} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input disabled={!isManager} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Address</Label><Input disabled={!isManager} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="practice-bhf">BHF practice number (optional — add for medical aid claims)</Label><Input id="practice-bhf" maxLength={50} disabled={!isManager} value={form.bhf_number} onChange={(e) => setForm({ ...form, bhf_number: e.target.value })} /></div>
                <div className="flex items-center gap-3"><Switch id="practice-medical-aid" disabled={!isManager} checked={form.is_medical_aid_practice} onCheckedChange={(checked) => setForm({ ...form, is_medical_aid_practice: checked })} /><Label htmlFor="practice-medical-aid">Medical aid practice</Label></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Permissions</CardTitle><CardDescription>Owner-only controls</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Nurses can support consultations</Label>
                    <p className="text-xs text-muted-foreground">Allow nurses to assist doctors during consultations.</p>
                  </div>
                  <Switch
                    disabled={!isOwner}
                    checked={form.nurses_can_support_consultations}
                    onCheckedChange={(v) => setForm({ ...form, nurses_can_support_consultations: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Practice active</Label>
                    <p className="text-xs text-muted-foreground">Deactivate to pause the practice.</p>
                  </div>
                  <Switch
                    disabled={!isOwner}
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </CardContent>
            </Card>

            {isManager && (
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => navigate("/practice/dashboard")}>Practice Team &amp; Earnings</Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PracticeSettings;
