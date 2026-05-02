import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Layout, Save, Plus, Trash2, Film } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PreviewWrapper from "./previews/PreviewWrapper";
import HeroPreview from "./previews/HeroPreview";

interface HeroFeature {
  icon: string;
  label: string;
  sub: string;
}

interface HeroContent {
  badge: string;
  title: string;
  highlight: string;
  subtitle: string;
  cta_primary: string;
  cta_secondary: string;
  features: HeroFeature[];
  /** When true, desktop visitors progressively load the hero video over the still image. */
  desktop_video_enabled?: boolean;
  /** Optional custom video URL. Falls back to /hero-bg.mp4 from /public if blank. */
  desktop_video_url?: string;
}

const defaultHero: HeroContent = {
  badge: "Trusted Video Consultations",
  title: "Your Doctor,",
  highlight: "One Click Away",
  subtitle: "",
  cta_primary: "Find a Doctor",
  cta_secondary: "Get Started Free",
  features: [],
  desktop_video_enabled: true,
  desktop_video_url: "",
};

const AdminHero = () => {
  const [hero, setHero] = useState<HeroContent>(defaultHero);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("site_content")
      .select("*")
      .eq("key", "hero")
      .single()
      .then(({ data }) => {
        if (data?.value) setHero(data.value as unknown as HeroContent);
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .update({ value: hero as any })
      .eq("key", "hero");
    setSaving(false);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else toast({ title: "Hero section updated" });
  };

  const updateFeature = (idx: number, field: keyof HeroFeature, val: string) => {
    const features = [...hero.features];
    features[idx] = { ...features[idx], [field]: val };
    setHero({ ...hero, features });
  };

  const addFeature = () => {
    setHero({ ...hero, features: [...hero.features, { icon: "Star", label: "", sub: "" }] });
  };

  const removeFeature = (idx: number) => {
    setHero({ ...hero, features: hero.features.filter((_, i) => i !== idx) });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Layout className="h-5 w-5 text-primary" /> Hero Section
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Badge Text</label>
            <Input value={hero.badge} onChange={(e) => setHero({ ...hero, badge: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Highlight Text</label>
            <Input value={hero.highlight} onChange={(e) => setHero({ ...hero, highlight: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Title</label>
            <Input value={hero.title} onChange={(e) => setHero({ ...hero, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Subtitle</label>
            <Textarea value={hero.subtitle} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} rows={2} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Primary CTA</label>
            <Input value={hero.cta_primary} onChange={(e) => setHero({ ...hero, cta_primary: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Secondary CTA</label>
            <Input value={hero.cta_secondary} onChange={(e) => setHero({ ...hero, cta_secondary: e.target.value })} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Features</p>
            <Button size="sm" variant="outline" onClick={addFeature} className="gap-1">
              <Plus className="h-3 w-3" /> Add Feature
            </Button>
          </div>
          {hero.features.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-3">
              <div className="grid flex-1 gap-2 sm:grid-cols-3">
                <Input value={f.icon} onChange={(e) => updateFeature(i, "icon", e.target.value)} placeholder="Icon (e.g. Video)" />
                <Input value={f.label} onChange={(e) => updateFeature(i, "label", e.target.value)} placeholder="Label" />
                <Input value={f.sub} onChange={(e) => updateFeature(i, "sub", e.target.value)} placeholder="Subtitle" />
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFeature(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <PreviewWrapper>
          <HeroPreview content={hero} />
        </PreviewWrapper>

        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminHero;
