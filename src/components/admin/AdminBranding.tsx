import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_BRANDING, resolveLogoSrc, type BrandingContent } from "@/hooks/useBranding";

const NAV_MIN = 24;
const NAV_MAX = 96;
const FOOT_MIN = 24;
const FOOT_MAX = 120;

const AdminBranding = () => {
  const [content, setContent] = useState<BrandingContent>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("site_content")
      .select("value")
      .eq("key", "branding")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setContent({ ...DEFAULT_BRANDING, ...(data.value as Partial<BrandingContent>) });
        setLoading(false);
      });
  }, []);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please upload an image." });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max 4 MB." });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("branding")
      .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast({ variant: "destructive", title: "Upload failed", description: upErr.message });
      return;
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    setContent((c) => ({ ...c, logo_url: data.publicUrl }));
    setUploading(false);
    toast({ title: "Logo uploaded", description: "Don't forget to save changes." });
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "branding", value: content as any }, { onConflict: "key" });
    setSaving(false);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else toast({ title: "Branding updated", description: "The site logo and sizes have been saved." });
  };

  const resetToDefault = () => {
    setContent((c) => ({ ...c, logo_url: "" }));
  };

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  const previewSrc = resolveLogoSrc(content);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <ImageIcon className="h-5 w-5 text-primary" /> Branding & Logo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Upload */}
        <div className="space-y-3">
          <Label>Site Logo</Label>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex h-24 w-40 items-center justify-center rounded-md border border-border bg-background">
              <img src={previewSrc} alt="Current logo" className="max-h-20 max-w-[140px] object-contain" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload new logo
                </Button>
                {content.logo_url && (
                  <Button type="button" variant="ghost" onClick={resetToDefault} className="gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" /> Use default
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP or SVG. Recommended: transparent background, square or wide horizontal layout. Max 4&nbsp;MB.
              </p>
              <Input
                value={content.logo_url}
                onChange={(e) => setContent({ ...content, logo_url: e.target.value })}
                placeholder="Or paste a public image URL"
              />
            </div>
          </div>
        </div>

        {/* Navbar size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Navbar logo height</Label>
            <span className="text-sm font-medium text-primary">{content.navbar_height}px</span>
          </div>
          <Slider
            min={NAV_MIN}
            max={NAV_MAX}
            step={2}
            value={[content.navbar_height]}
            onValueChange={(v) => setContent({ ...content, navbar_height: v[0] })}
          />
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="mb-2 text-xs text-muted-foreground">Navbar preview</p>
            <div className="flex h-16 items-center rounded-md border border-border bg-background px-4">
              <img src={previewSrc} alt="Navbar logo preview" style={{ height: content.navbar_height }} className="w-auto" />
            </div>
          </div>
        </div>

        {/* Footer size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Footer logo height</Label>
            <span className="text-sm font-medium text-primary">{content.footer_height}px</span>
          </div>
          <Slider
            min={FOOT_MIN}
            max={FOOT_MAX}
            step={2}
            value={[content.footer_height]}
            onValueChange={(v) => setContent({ ...content, footer_height: v[0] })}
          />
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="mb-2 text-xs text-muted-foreground">Footer preview</p>
            <div className="flex items-center rounded-md border border-border bg-muted/40 p-4">
              <img src={previewSrc} alt="Footer logo preview" style={{ height: content.footer_height }} className="w-auto" />
            </div>
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminBranding;
