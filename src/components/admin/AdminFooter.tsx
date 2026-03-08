import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, PanelBottom } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PreviewWrapper from "./previews/PreviewWrapper";
import FooterPreview from "./previews/FooterPreview";

interface FooterContent {
  tagline: string;
  email: string;
  whatsapp: string;
  whatsapp_display: string;
  address: string;
  copyright: string;
  disclaimer_consultation: string;
  disclaimer_emergency: string;
}

const defaultContent: FooterContent = {
  tagline: "Making healthcare accessible, one consultation at a time.",
  email: "support@doctorsonlining.com",
  whatsapp: "27605445802",
  whatsapp_display: "+27 60 544 5802",
  address: "61 Albatross Drive, Fourways, 2191, South Africa",
  copyright: "Doctors Onlining. All rights reserved.",
  disclaimer_consultation: "All consultations are conducted by independently licensed and registered healthcare professionals.",
  disclaimer_emergency: "This platform is not intended for medical emergencies. If you are experiencing a medical emergency, please call your local emergency services immediately.",
};

const AdminFooter = () => {
  const [content, setContent] = useState<FooterContent>(defaultContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("site_content")
      .select("value")
      .eq("key", "footer")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setContent(data.value as unknown as FooterContent);
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "footer", value: content as any }, { onConflict: "key" });
    setSaving(false);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else toast({ title: "Footer updated" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <PanelBottom className="h-5 w-5 text-primary" /> Footer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tagline</label>
            <Input value={content.tagline} onChange={(e) => setContent({ ...content, tagline: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input value={content.email} onChange={(e) => setContent({ ...content, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">WhatsApp Number (digits only)</label>
            <Input value={content.whatsapp} onChange={(e) => setContent({ ...content, whatsapp: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">WhatsApp Display</label>
            <Input value={content.whatsapp_display} onChange={(e) => setContent({ ...content, whatsapp_display: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium text-foreground">Physical Address</label>
            <Input value={content.address} onChange={(e) => setContent({ ...content, address: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium text-foreground">Copyright Text</label>
            <Input value={content.copyright} onChange={(e) => setContent({ ...content, copyright: e.target.value })} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Consultation Disclaimer</label>
            <Textarea value={content.disclaimer_consultation} onChange={(e) => setContent({ ...content, disclaimer_consultation: e.target.value })} rows={2} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Emergency Disclaimer</label>
            <Textarea value={content.disclaimer_emergency} onChange={(e) => setContent({ ...content, disclaimer_emergency: e.target.value })} rows={2} />
          </div>
        </div>

        <PreviewWrapper>
          <FooterPreview content={content} />
        </PreviewWrapper>

        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminFooter;
