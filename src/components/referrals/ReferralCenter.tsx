import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { buildReferralLink } from "@/lib/referral";
import type { User as SupaUser } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Share2, Mail, Download, Gift, Loader2, Users, Wallet, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Stats = {
  total: number;
  pending: number;
  eligible: number;
  approved: number;
  rejected: number;
  earnings_pending: number;
  earnings_paid: number;
  currency: string;
};

type ReferralRow = {
  id: string;
  status: string;
  referred_email: string | null;
  referred_type: string | null;
  registration_date: string | null;
  first_consultation_date: string | null;
  reward_amount: number | null;
  reward_currency: string | null;
};

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  pending_signup: { label: "Pending Signup", variant: "outline" },
  pending_verification: { label: "Pending Verification", variant: "secondary" },
  pending_first_consult: { label: "Awaiting First Consult", variant: "secondary" },
  eligible: { label: "Eligible", variant: "default" },
  approved: { label: "Approved", variant: "default" },
  paid: { label: "Paid", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  fraud_detected: { label: "Fraud Flagged", variant: "destructive" },
};

const ReferralCenter = ({ user }: { user: SupaUser }) => {
  const [code, setCode] = useState<string>("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // ensure code exists & fetch
        const { data: codeData } = await supabase.rpc("ensure_referral_code", { _user_id: user.id });
        const myCode = (codeData as string) || "";
        setCode(myCode);

        const { data: statsData } = await supabase.rpc("get_user_referral_stats", { _user_id: user.id });
        setStats(statsData as Stats);

        const { data: refsData } = await supabase
          .from("referrals")
          .select("id,status,referred_email,referred_type,registration_date,first_consultation_date,reward_amount,reward_currency")
          .eq("referrer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);
        setRows((refsData ?? []) as ReferralRow[]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  const link = code ? buildReferralLink(code) : "";

  useEffect(() => {
    if (!link || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, link, { width: 200, margin: 1 }, () => undefined);
  }, [link]);

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copied" });
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`Join me on Doctors Onlining — book trusted doctors online. ${link}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener");
  };
  const shareEmail = () => {
    const subj = encodeURIComponent("Try Doctors Onlining");
    const body = encodeURIComponent(`I use Doctors Onlining for online consultations. Sign up with my link:\n\n${link}`);
    window.location.href = `mailto:?subject=${subj}&body=${body}`;
  };
  const downloadQR = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.download = `doctors-onlining-${code}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const currency = stats?.currency || "ZAR";
  const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n || 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <KPI icon={<Users className="h-4 w-4" />} label="Total Referrals" value={stats?.total ?? 0} />
        <KPI icon={<Clock className="h-4 w-4" />} label="Pending" value={stats?.pending ?? 0} />
        <KPI icon={<CheckCircle2 className="h-4 w-4" />} label="Approved" value={stats?.approved ?? 0} />
        <KPI icon={<Wallet className="h-4 w-4" />} label="Earnings Paid" value={fmt(stats?.earnings_paid ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" />Your Referral Link</CardTitle>
          <CardDescription>
            Share your link. You earn when your invite signs up, verifies, and completes their first consultation.
            Pending earnings: <span className="font-medium text-foreground">{fmt(stats?.earnings_pending ?? 0)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start">
            <div className="flex-1 space-y-3">
              <div className="flex gap-2">
                <Input readOnly value={link} className="font-mono text-sm" />
                <Button onClick={copy} variant="secondary"><Copy className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={shareWhatsApp} variant="outline" size="sm" className="gap-1.5">
                  <Share2 className="h-4 w-4" /> WhatsApp
                </Button>
                <Button onClick={shareEmail} variant="outline" size="sm" className="gap-1.5">
                  <Mail className="h-4 w-4" /> Email
                </Button>
                <Button onClick={downloadQR} variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-4 w-4" /> Download QR
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Your code: <span className="font-mono">{code}</span></p>
            </div>
            <div className="flex justify-center">
              <canvas ref={canvasRef} className="rounded-md border bg-white p-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
          <CardDescription>Status updates automatically as your invites progress.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No referrals yet — share your link to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invite</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>First Consult</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Reward</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const meta = STATUS_LABELS[r.status] || { label: r.status, variant: "outline" as const };
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="max-w-[180px] truncate">{r.referred_email || "—"}</TableCell>
                        <TableCell className="capitalize">{r.referred_type || "—"}</TableCell>
                        <TableCell>{r.registration_date ? new Date(r.registration_date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>{r.first_consultation_date ? new Date(r.first_consultation_date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                        <TableCell className="text-right">
                          {r.reward_amount && r.reward_amount > 0
                            ? new Intl.NumberFormat(undefined, { style: "currency", currency: r.reward_currency || currency }).format(r.reward_amount)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const KPI = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-foreground">{value}</p>
    </CardContent>
  </Card>
);

export default ReferralCenter;
