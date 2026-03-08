import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminSiteSettings = () => {
  const [loading, setLoading] = useState(true);
  const [pdfEnabled, setPdfEnabled] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "pdf_download_enabled")
        .maybeSingle();
      if (data) setPdfEnabled((data.value as any)?.enabled !== false);
      setLoading(false);
    };
    load();
  }, []);

  const toggle = async (checked: boolean) => {
    setPdfEnabled(checked);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "pdf_download_enabled", value: { enabled: checked } as any }, { onConflict: "key" });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setPdfEnabled(!checked);
    } else {
      toast({ title: checked ? "PDF download enabled" : "PDF download disabled" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Site Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <Label className="text-base font-medium">PDF Download on Legal Pages</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Allow users to download Terms & Privacy pages as PDF
            </p>
          </div>
          <Switch checked={pdfEnabled} onCheckedChange={toggle} />
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSiteSettings;
