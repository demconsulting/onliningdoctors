import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_MINUTES = [60, 5, 1];

const AdminSiteSettings = () => {
  const [loading, setLoading] = useState(true);
  const [pdfEnabled, setPdfEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState<string>(DEFAULT_MINUTES.join(", "));
  const [savingReminders, setSavingReminders] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const [{ data: pdfRow }, { data: remRow }] = await Promise.all([
        supabase.from("site_content").select("value").eq("key", "pdf_download_enabled").maybeSingle(),
        supabase.from("site_content").select("value").eq("key", "appointment_reminder_minutes").maybeSingle(),
      ]);
      if (pdfRow) setPdfEnabled((pdfRow.value as any)?.enabled !== false);
      const mins = (remRow?.value as any)?.minutes;
      if (Array.isArray(mins) && mins.length) setReminderMinutes(mins.join(", "));
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

  const saveReminders = async () => {
    const minutes = reminderMinutes
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0 && n <= 24 * 60);

    if (!minutes.length) {
      toast({ title: "Invalid input", description: "Enter at least one positive number of minutes (e.g. 60, 5, 1).", variant: "destructive" });
      return;
    }

    setSavingReminders(true);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "appointment_reminder_minutes", value: { minutes } as any }, { onConflict: "key" });
    setSavingReminders(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setReminderMinutes(minutes.join(", "));
      toast({ title: "Reminder times updated", description: `Notifications will fire ${minutes.join(", ")} minutes before each appointment.` });
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
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Appointment Reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reminder-minutes" className="text-base font-medium">
              Reminder times (minutes before appointment)
            </Label>
            <p className="text-sm text-muted-foreground">
              Comma-separated list. Patients and doctors will receive an in-app notification and email at each interval. Default: 60, 5, 1.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="reminder-minutes"
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(e.target.value)}
                placeholder="60, 5, 1"
                className="sm:max-w-xs"
              />
              <Button onClick={saveReminders} disabled={savingReminders}>
                {savingReminders && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSiteSettings;
