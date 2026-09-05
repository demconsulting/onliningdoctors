import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Stethoscope, Wallet, Search } from "lucide-react";
import { toast } from "sonner";

interface IndependentDoctor {
  profile_id: string;
  license_number: string | null;
  bhf_number: string | null;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  paystack_subaccount_code: string | null;
  is_payout_verified: boolean | null;
  is_verified: boolean | null;
  full_name?: string | null;
}

const mask = (value: string | null) =>
  value ? `•••• ${value.slice(-4)}` : "—";

const AdminIndependentDoctors = () => {
  const [doctors, setDoctors] = useState<IndependentDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [bankCodes, setBankCodes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("doctors")
      .select("profile_id, license_number, bhf_number, bank_name, account_name, account_number, paystack_subaccount_code, is_payout_verified, is_verified")
      .eq("practice_type", "independent")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as IndependentDoctor[];
    const ids = rows.map((d) => d.profile_id);
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      const nameById = new Map((profiles || []).map((p) => [p.id, p.full_name]));
      rows.forEach((d) => { d.full_name = nameById.get(d.profile_id) ?? null; });
    }
    setDoctors(rows);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (doctorId: string, approve: boolean) => {
    setBusyId(doctorId);
    const { error } = await supabase
      .from("doctors")
      .update({ is_verified: approve })
      .eq("profile_id", doctorId);
    if (error) {
      setBusyId(null);
      toast.error(error.message);
      return;
    }
    if (approve) {
      await createSubaccount(doctorId, false);
    } else {
      toast.success("Doctor rejected");
      setBusyId(null);
      load();
    }
  };

  const createSubaccount = async (doctorId: string, standalone = true) => {
    setBusyId(doctorId);
    const { data, error } = await supabase.functions.invoke("create-paystack-subaccount", {
      body: { doctor_id: doctorId, bank_code: bankCodes[doctorId] || undefined },
    });
    setBusyId(null);
    const payload = data as { error?: string; subaccount_code?: string } | null;
    if (error || payload?.error) {
      toast.error(payload?.error || error?.message || "Could not create the payout account");
    } else {
      toast.success(standalone ? "Payout account created" : "Doctor approved and payout account created");
    }
    load();
  };

  const filtered = doctors.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [d.full_name, d.license_number, d.bhf_number, d.bank_name]
      .some((v) => (v || "").toLowerCase().includes(q));
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">Independent Doctors</h3>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search name, HPCSA, bank"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No independent doctors yet.</CardContent></Card>
      )}

      {filtered.map((d) => {
        const bankReady = !!(d.bank_name && d.account_name && d.account_number);
        return (
          <Card key={d.profile_id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  {d.full_name || "Unnamed doctor"}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={d.is_verified ? "default" : "outline"}>
                    {d.is_verified ? "Approved" : "Pending approval"}
                  </Badge>
                  <Badge variant={bankReady ? "secondary" : "destructive"}>
                    {bankReady ? "Bank details on file" : "Bank details missing"}
                  </Badge>
                  <Badge variant={d.paystack_subaccount_code ? "default" : "outline"}>
                    {d.paystack_subaccount_code ? "Subaccount active" : "No subaccount"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 text-sm sm:grid-cols-4">
                <div>
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground">HPCSA Number</span>
                  {d.license_number || "—"}
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground">BHF Number</span>
                  {d.bhf_number || <span className="text-muted-foreground">Private / Cash Only</span>}
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground">Bank</span>
                  {d.bank_name || "—"}
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground">Account</span>
                  {mask(d.account_number)}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                {!d.is_verified && (
                  <>
                    <Button size="sm" disabled={busyId === d.profile_id} onClick={() => review(d.profile_id, true)}>
                      {busyId === d.profile_id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyId === d.profile_id} onClick={() => review(d.profile_id, false)}>
                      Reject
                    </Button>
                  </>
                )}
                {d.is_verified && !d.paystack_subaccount_code && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor={`bank-code-${d.profile_id}`} className="text-xs">Bank code (optional)</Label>
                      <Input
                        id={`bank-code-${d.profile_id}`}
                        className="h-9 w-40"
                        value={bankCodes[d.profile_id] || ""}
                        onChange={(e) => setBankCodes({ ...bankCodes, [d.profile_id]: e.target.value })}
                        placeholder="e.g. 632005"
                      />
                    </div>
                    <Button size="sm" variant="outline" disabled={busyId === d.profile_id} onClick={() => createSubaccount(d.profile_id)}>
                      {busyId === d.profile_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                      Create payout account
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminIndependentDoctors;
