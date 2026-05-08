import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Clock, DollarSign, TrendingUp, ArrowRight, Sparkles,
  CalendarPlus, Wallet, ListChecks, CheckCircle2, CircleAlert,
  FileText, BookTemplate,
} from "lucide-react";
import { format, isToday, addDays, startOfMonth } from "date-fns";
import type { User } from "@supabase/supabase-js";
import { getCurrencySymbol } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

interface Props {
  user: User;
  doctorCountry: string | null;
  onNavigateTab: (tab: string) => void;
}

const DoctorOverview = ({ user, doctorCountry, onNavigateTab }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [hasAvailability, setHasAvailability] = useState(false);
  const [hasPricing, setHasPricing] = useState(false);

  const symbol = getCurrencySymbol(doctorCountry || undefined);

  useEffect(() => {
    const load = async () => {
      const monthStart = startOfMonth(new Date()).toISOString();
      const [profRes, docRes, apptRes, payRes, availRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("doctors").select("*").eq("profile_id", user.id).single(),
        supabase.from("appointments")
          .select("id, scheduled_at, status, duration_minutes")
          .eq("doctor_id", user.id)
          .gte("scheduled_at", new Date().toISOString())
          .in("status", ["pending", "confirmed"])
          .order("scheduled_at", { ascending: true })
          .limit(20),
        supabase.from("payments" as any)
          .select("amount, doctor_amount, created_at, status")
          .eq("doctor_id", user.id)
          .eq("status", "success")
          .gte("created_at", monthStart),
        supabase.from("doctor_availability").select("id").eq("doctor_id", user.id).limit(1),
      ]);

      if (profRes.data) setProfile(profRes.data);
      if (docRes.data) {
        setDoctor(docRes.data);
        setIsAvailable((docRes.data as any).is_available ?? false);
      }
      if (apptRes.data) setAppointments(apptRes.data);
      if (payRes.data) {
        const total = payRes.data.reduce((sum: number, p: any) => sum + (Number(p.doctor_amount) || Number(p.amount) || 0), 0);
        setMonthlyEarnings(total);
      }
      setHasAvailability(!!availRes.data?.length);
      setHasPricing(!!(docRes.data as any)?.consultation_fee);
      setLoading(false);
    };
    load();
  }, [user.id]);

  const today = useMemo(() => appointments.filter(a => isToday(new Date(a.scheduled_at))), [appointments]);
  const upcoming7 = useMemo(() => {
    const cutoff = addDays(new Date(), 7);
    return appointments.filter(a => new Date(a.scheduled_at) <= cutoff);
  }, [appointments]);

  const completion = useMemo(() => {
    if (!profile || !doctor) return { pct: 0, missing: [] as { label: string; tab: string }[] };
    const checks: { ok: boolean; label: string; tab: string }[] = [
      { ok: !!profile.full_name, label: "Add your full name", tab: "profile" },
      { ok: !!profile.avatar_url, label: "Upload a profile photo", tab: "profile" },
      { ok: !!profile.phone, label: "Add a phone number", tab: "profile" },
      { ok: !!doctor.specialty_id, label: "Choose your specialty", tab: "profile" },
      { ok: !!doctor.license_number, label: "Add your HPCSA Registration Number", tab: "profile" },
      { ok: hasPricing, label: "Set your consultation fee", tab: "pricing" },
      { ok: hasAvailability, label: "Set your availability", tab: "availability" },
      { ok: !!doctor.bio, label: "Write a short bio (optional)", tab: "profile" },
      { ok: (doctor.languages?.length ?? 0) > 0, label: "Add languages you speak (optional)", tab: "profile" },
      { ok: !!doctor.education, label: "Add qualifications (optional)", tab: "profile" },
    ];
    const done = checks.filter(c => c.ok).length;
    return {
      pct: Math.round((done / checks.length) * 100),
      missing: checks.filter(c => !c.ok).slice(0, 3).map(({ label, tab }) => ({ label, tab })),
    };
  }, [profile, doctor, hasAvailability, hasPricing]);

  const toggleAvailable = async (val: boolean) => {
    setIsAvailable(val);
    const { error } = await supabase.from("doctors").update({ is_available: val } as any).eq("profile_id", user.id);
    if (error) {
      setIsAvailable(!val);
      toast({ variant: "destructive", title: "Could not update status", description: error.message });
    } else {
      toast({ title: val ? "You're online" : "You're offline", description: val ? "Patients can now book you." : "You won't appear as available." });
    }
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }

  const nextAppt = today[0] || upcoming7[0];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Today's Appointments"
          value={today.length.toString()}
          hint={today[0] ? `Next at ${format(new Date(today[0].scheduled_at), "h:mm a")}` : "Nothing today"}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Upcoming (7 days)"
          value={upcoming7.length.toString()}
          hint={nextAppt ? format(new Date(nextAppt.scheduled_at), "EEE, MMM d") : "Calendar clear"}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="This Month's Earnings"
          value={`${symbol} ${monthlyEarnings.toLocaleString()}`}
          hint="Successful payments only"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Profile Completion"
          value={`${completion.pct}%`}
          hint={completion.pct === 100 ? "All set" : "Add a few details"}
        />
      </div>

      {/* Availability + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {isAvailable ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <CircleAlert className="h-4 w-4 text-muted-foreground" />}
                  {isAvailable ? "Online" : "Offline"}
                </div>
                <p className="text-xs text-muted-foreground">Toggle to accept new bookings</p>
              </div>
              <Switch checked={isAvailable} onCheckedChange={toggleAvailable} />
            </div>
            <ActionTile icon={<Clock className="h-4 w-4" />} label="Set Availability" onClick={() => onNavigateTab("availability")} />
            <ActionTile icon={<CalendarPlus className="h-4 w-4" />} label="View Appointments" onClick={() => onNavigateTab("appointments")} />
            <ActionTile icon={<Wallet className="h-4 w-4" />} label="Update Pricing" onClick={() => onNavigateTab("pricing")} />
          </CardContent>
        </Card>

        {/* Profile completion */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" /> Complete your profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{completion.pct}%</span>
              </div>
              <Progress value={completion.pct} className="h-2" />
            </div>
            {completion.missing.length === 0 ? (
              <p className="text-sm text-muted-foreground">Your profile looks great.</p>
            ) : (
              <ul className="space-y-2">
                {completion.missing.map((m, i) => (
                  <li key={i}>
                    <button
                      onClick={() => onNavigateTab(m.tab)}
                      className="flex w-full items-center justify-between rounded-md border p-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
                    >
                      <span>{m.label}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advanced tools */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Advanced tools</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <ActionTile icon={<TrendingUp className="h-4 w-4" />} label="Wallet & Payouts" onClick={() => onNavigateTab("wallet")} />
          <ActionTile icon={<FileText className="h-4 w-4" />} label="Prescriptions" onClick={() => onNavigateTab("prescriptions")} />
          <ActionTile icon={<BookTemplate className="h-4 w-4" />} label="Prescription Templates" onClick={() => onNavigateTab("templates")} />
        </CardContent>
      </Card>

      {/* Wellness+ teaser */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-semibold">Wellness+</h3>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                AI-powered wellness guidance for your patients — healthy eating, exercise, lifestyle support and preventative health, designed to drive more consultations to you.
              </p>
            </div>
          </div>
          <Button onClick={() => toast({ title: "You're on the list", description: "We'll notify you when Wellness+ launches." })} className="gradient-primary border-0 text-primary-foreground">
            Join Early Access
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

const ActionTile = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
  >
    <span className="flex items-center gap-2 font-medium">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
    <ArrowRight className="h-4 w-4 text-muted-foreground" />
  </button>
);

export default DoctorOverview;
