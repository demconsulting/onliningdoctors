import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DoctorCTAContent {
  heading: string;
  subheading: string;
  register_text: string;
  login_text: string;
}

const defaultContent: DoctorCTAContent = {
  heading: "Are You a Doctor?",
  subheading: "Join our platform and reach thousands of patients seeking quality healthcare. Expand your practice with flexible online consultations.",
  register_text: "Register as a Doctor",
  login_text: "Sign in as Doctor",
};

const AdminDoctorCTA = () => {
  const [content, setContent] = useState<DoctorCTAContent>(defaultContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("site_content")
      .select("value")
      .eq("key", "doctor_cta")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setContent(data.value as unknown as DoctorCTAContent);
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "doctor_cta", value: content as any }, { onConflict: "key" });
    setSaving(false);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else toast({ title: "Doctor CTA section updated" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Stethoscope className="h-5 w-5 text-primary" /> Doctor CTA Section
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Heading</label>
            <Input value={content.heading} onChange={(e) => setContent({ ...content, heading: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Register Button Text</label>
            <Input value={content.register_text} onChange={(e) => setContent({ ...content, register_text: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Subheading</label>
          <Textarea value={content.subheading} onChange={(e) => setContent({ ...content, subheading: e.target.value })} rows={2} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Login Button Text</label>
          <Input value={content.login_text} onChange={(e) => setContent({ ...content, login_text: e.target.value })} />
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminDoctorCTA;
