import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PreviewWrapper from "./previews/PreviewWrapper";
import FindDoctorPreview from "./previews/FindDoctorPreview";

interface FindDoctorContent {
  heading: string;
  subheading: string;
  button_text: string;
}

const defaultContent: FindDoctorContent = {
  heading: "Find Your Doctor",
  subheading: "Browse our verified doctors, filter by specialty, location, and rating to find the perfect match.",
  button_text: "View All Doctors",
};

const AdminFindDoctor = () => {
  const [content, setContent] = useState<FindDoctorContent>(defaultContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("site_content")
      .select("value")
      .eq("key", "find_doctor")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setContent(data.value as unknown as FindDoctorContent);
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "find_doctor", value: content as any }, { onConflict: "key" });
    setSaving(false);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else toast({ title: "Find Doctor section updated" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Search className="h-5 w-5 text-primary" /> Find Doctor Section
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Heading</label>
            <Input value={content.heading} onChange={(e) => setContent({ ...content, heading: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Button Text</label>
            <Input value={content.button_text} onChange={(e) => setContent({ ...content, button_text: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Subheading</label>
          <Textarea value={content.subheading} onChange={(e) => setContent({ ...content, subheading: e.target.value })} rows={2} />
        </div>
        <PreviewWrapper>
          <FindDoctorPreview content={content} />
        </PreviewWrapper>

        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminFindDoctor;
