import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Building2, Wallet, Users } from "lucide-react";
import { toast } from "sonner";
import { usePractice } from "@/hooks/usePractice";
import type { User } from "@supabase/supabase-js";

interface Banking {
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  paystack_subaccount_code: string | null;
  is_payout_verified: boolean | null;
}

interface Earning {
  doctor_id: string;
  doctor_name: string | null;
  consultations: number;
  gross: number;
  platform_fee: number;
  processing_fee: number;
  net: number;
}

interface PracticeDoctor {
  profile_id: string;
  practice_approval_status: string | null;
  license_number: string | null;
  full_name?: string | null;
}

const zar = (v: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(v || 0);

const PracticeDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const { practice, myMember, loading: practiceLoading } = usePractice(user?.id);
  const [banking, setBanking] = useState<Banking | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [doctors, setDoctors] = useState<PracticeDoctor[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isOwner = !!practice && !!user && practice.owner_id === user.id;
  const isManager = isOwner || myMember?.role === "practice_admin";

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUser(session.user);
      setChecking(false);
    })();
  }, [navigate]);

  const loadData = useCallback(async () => {
    if (!practice) return;
    const [{ data: bank }, { data: earn }, { data: docs }] = await Promise.all([
      supabase.rpc("get_practice_banking", { _practice_id: practice.id }),
      supabase.rpc("practice_doctor_earnings", { _practice_id: practice.id }),
      supabase.from("doctors").select("profile_id, practice_approval_status, license_number").eq("practice_id", practice.id),
    ]);
    setBanking((Array.isArray(bank) ? bank[0] : bank) as Banking | null);
    setEarnings((earn || []) as Earning[]);
    const rows = (docs || []) as PracticeDoctor[];
    if (rows.length) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", rows.map((r) => r.profile_id));
      const byId = new Map((profiles || []).map((p) => [p.id, p.full_name]));
      rows.forEach((r) => { r.full_name = byId.get(r.profile_id) ?? null; });
    }
    setDoctors(rows);
  }, [practice]);

  useEffect(() => { loadData(); }, [loadData]);

  const review = async (doctorId: string, approve: boolean) => {
    setBusyId(doctorId);
    const { error } = await supabase.rpc("practice_review_doctor", { _doctor_id: doctorId, _approve: approve });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Doctor approved" : "Doctor rejected");
    loadData();
  };

  if (checking || practiceLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!practice) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="container mx-auto flex-1 px-4 py-12">
          <Card className="mx-auto max-w-xl">
            <CardHeader>
              <CardTitle>No practice yet</CardTitle>
              <CardDescription>Register a practice or ask a practice owner to add you to theirs.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/practice/setup")}>Register a practice</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const myEarning = earnings.find((e) => e.doctor_id === user?.id);
  const totals = earnings.reduce(
    (acc, e) => ({
      consultations: acc.consultations + Number(e.consultations || 0),
      gross: acc.gross + Number(e.gross || 0),
      net: acc.net + Number(e.net || 0),
    }),
    { consultations: 0, gross: 0, net: 0 }
  );
  const pendingDoctors = doctors.filter((d) => d.practice_approval_status !== "approved");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container mx-auto flex-1 space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">{practice.practice_name}</h1>
            <p className="text-sm text-muted-foreground">Practice #{practice.practice_number}</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/practice/team")}>Manage team</Button>
        </div>

        {isManager && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4 text-primary" /> Payout status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant={banking?.paystack_subaccount_code ? "default" : "outline"}>
                {banking?.paystack_subaccount_code ? "Active — payout account linked" : "Not linked yet"}
              </Badge>
              <Badge variant={banking?.is_payout_verified ? "secondary" : "outline"}>
                {banking?.is_payout_verified ? "Verified" : "Awaiting verification"}
              </Badge>
              <span className="text-muted-foreground">
                {banking?.bank_name || "No bank"} · {banking?.account_number ? `•••• ${banking.account_number.slice(-4)}` : "—"}
              </span>
            </CardContent>
          </Card>
        )}

        {isManager && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" /> Doctors</CardTitle>
              <CardDescription>Doctors must be approved here before they can consult under this practice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {doctors.length === 0 && <p className="text-sm text-muted-foreground">No doctors have joined yet.</p>}
              {doctors.map((d) => (
                <div
                  key={d.profile_id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm ${d.practice_approval_status !== "approved" ? "border-primary/40 bg-primary/5" : "border-border"}`}
                >
                  <div>
                    <div className="font-medium">{d.full_name || "Unnamed doctor"}</div>
                    <div className="text-xs text-muted-foreground">HPCSA {d.license_number || "—"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={d.practice_approval_status === "approved" ? "default" : "outline"}>
                      {d.practice_approval_status === "approved" ? "Approved" : "Pending"}
                    </Badge>
                    {d.practice_approval_status === "approved" ? (
                      <Button size="sm" variant="outline" disabled={busyId === d.profile_id} onClick={() => review(d.profile_id, false)}>Revoke</Button>
                    ) : (
                      <>
                        <Button size="sm" disabled={busyId === d.profile_id} onClick={() => review(d.profile_id, true)}>Approve</Button>
                        <Button size="sm" variant="outline" disabled={busyId === d.profile_id} onClick={() => review(d.profile_id, false)}>Reject</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {pendingDoctors.length > 0 && (
                <p className="text-xs text-muted-foreground">{pendingDoctors.length} doctor(s) awaiting your approval.</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-primary" /> {isManager ? "Practice financials" : "My consultation log"}</CardTitle>
            <CardDescription>
              {isManager
                ? "Consultations settled into the practice account, broken down per doctor."
                : "Consultations you performed under this practice — earnings due to you from the practice owner."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isManager && (
              <div className="grid gap-3 sm:grid-cols-3">
                {[["Consultations", String(totals.consultations)], ["Gross fees", zar(totals.gross)], ["Net settled", zar(totals.net)]].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
                    <div className="text-lg font-semibold">{value}</div>
                  </div>
                ))}
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead className="text-right">Consultations</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Platform fee</TableHead>
                  <TableHead className="text-right">Gateway fee</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isManager ? earnings : myEarning ? [myEarning] : []).map((e) => (
                  <TableRow key={e.doctor_id}>
                    <TableCell>{e.doctor_name || "—"}</TableCell>
                    <TableCell className="text-right">{e.consultations}</TableCell>
                    <TableCell className="text-right">{zar(Number(e.gross))}</TableCell>
                    <TableCell className="text-right">{zar(Number(e.platform_fee))}</TableCell>
                    <TableCell className="text-right">{zar(Number(e.processing_fee))}</TableCell>
                    <TableCell className="text-right font-medium">{zar(Number(e.net))}</TableCell>
                  </TableRow>
                ))}
                {(isManager ? earnings.length === 0 : !myEarning) && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No consultations recorded yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PracticeDashboard;
