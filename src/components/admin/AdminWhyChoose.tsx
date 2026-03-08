import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Plus, Trash2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PreviewWrapper from "./previews/PreviewWrapper";
import WhyChoosePreview from "./previews/WhyChoosePreview";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface WhyChooseContent {
  heading: string;
  subheading: string;
  features: Feature[];
}

const defaultContent: WhyChooseContent = {
  heading: "Why Choose Onlining Doctors?",
  subheading: "Experience healthcare reimagined with our comprehensive telemedicine platform",
  features: [],
};

const AdminWhyChoose = () => {
  const [content, setContent] = useState<WhyChooseContent>(defaultContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("site_content")
      .select("value")
      .eq("key", "why_choose")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setContent(data.value as unknown as WhyChooseContent);
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "why_choose", value: content as any }, { onConflict: "key" });
    setSaving(false);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else toast({ title: "Why Choose section updated" });
  };

  const updateFeature = (idx: number, field: keyof Feature, val: string) => {
    const features = [...content.features];
    features[idx] = { ...features[idx], [field]: val };
    setContent({ ...content, features });
  };

  const addFeature = () => {
    setContent({ ...content, features: [...content.features, { icon: "Star", title: "", description: "" }] });
  };

  const removeFeature = (idx: number) => {
    setContent({ ...content, features: content.features.filter((_, i) => i !== idx) });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Sparkles className="h-5 w-5 text-primary" /> Why Choose Section
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Heading</label>
            <Input value={content.heading} onChange={(e) => setContent({ ...content, heading: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Subheading</label>
            <Textarea value={content.subheading} onChange={(e) => setContent({ ...content, subheading: e.target.value })} rows={2} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Features</p>
            <Button size="sm" variant="outline" onClick={addFeature} className="gap-1">
              <Plus className="h-3 w-3" /> Add Feature
            </Button>
          </div>
          {content.features.map((f, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-border p-3">
              <div className="grid flex-1 gap-2 sm:grid-cols-3">
                <Input value={f.icon} onChange={(e) => updateFeature(i, "icon", e.target.value)} placeholder="Icon (e.g. Video, Shield, Calendar)" />
                <Input value={f.title} onChange={(e) => updateFeature(i, "title", e.target.value)} placeholder="Title" />
                <Textarea value={f.description} onChange={(e) => updateFeature(i, "description", e.target.value)} placeholder="Description" rows={2} />
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFeature(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminWhyChoose;
