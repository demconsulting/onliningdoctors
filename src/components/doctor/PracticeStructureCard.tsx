import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Stethoscope, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface Props { user: User }

interface DoctorRow {
  practice_type: string | null;
  practice_id: string | null;
  practice_approval_status: string | null;
  bhf_number: string | null;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  paystack_subaccount_code: string | null;
  is_payout_verified: boolean | null;
}

interface PracticeOption {
  id: string;
  practice_name: string;
  practice_number: string;
  bhf_number: string | null;
}

const PracticeStructureCard = ({ user }: Props) => {
  const [doctor, setDoctor] = useState<DoctorRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<"independent" | "group_member">("independent");
  const [bank, setBank] = useState({ bank_name: "", account_name: "", account_number: "", bhf_number: "" });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PracticeOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [practiceName, setPracticeName] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("doctors")
      .select("practice_type, practice_id, practice_approval_status, bhf_number, bank_name, account_name, account_number, paystack_subaccount_code, is_payout_verified")
      .eq("profile_id", user.id)
      .maybeSingle();
    const row = (data as DoctorRow | null) ?? null;
    setDoctor(row);
    if (row) {
      setType((row.practice_type as "independent" | "group_member") || (row.practice_id ? "group_member" : "independent"));
      setBank({
        bank_name: row.bank_name || "",
        account_name: row.account_name || "",
        account_number: row.account_number || "",
        bhf_number: row.bhf_number || "",
      });
      if (row.practice_id) {
        const { data: p } = await supabase.from("practices").select("practice_name").eq("id", row.practice_id).maybeSingle();
        setPracticeName(p?.practice_name ?? null);
      }
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const searchPractices = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    const { data } = await supabase
      .from("practices")
      .select("id, practice_name, practice_number, bhf_number")
      .eq("status", "approved")
      .or(`practice_name.ilike.%${query.trim()}%,practice_number.ilike.%${query.trim()}%`)
      .limit(10);
    setResults((data || []) as PracticeOption[]);
    setSearching(false);
  };

  const saveIndependent = async () => {
    if (!bank.bank_name.trim() || !bank.account_name.trim() || !bank.account_number.trim()) {
      toast.error("Bank name, account holder and account number are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("doctors")
      .update({
        practice_type: "independent",
        bank_name: bank.bank_name.trim(),
        account_name: bank.account_name.trim(),
        account_number: bank.account_number.trim(),
        bhf_number: bank.bhf_number.trim() || null,
      })
      .eq("profile_id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved — an admin will approve your payout account");
    load();
  };

  const joinPractice = async (practiceId: string) => {
    setSaving(true);
    const { error } = await supabase.rpc("request_join_practice", { _practice_id: practiceId });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Request sent — the practice owner must approve you");
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const approvalStatus = doctor?.practice_approval_status;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Practice structure &amp; payouts</CardTitle>
          <CardDescription>Choose how you practise — this decides where consultation payments settle.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setType("independent")}
              className={`rounded-lg border p-4 text-left transition ${type === "independent" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
            >
              <div className="flex items-center gap-2 font-semibold"><Stethoscope className="h-4 w-4 text-primary" /> Independent Doctor</div>
              <p className="mt-1 text-xs text-muted-foreground">Payments settle straight into your own business bank account.</p>
            </button>
            <button
              type="button"
              onClick={() => setType("group_member")}
              className={`rounded-lg border p-4 text-left transition ${type === "group_member" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
            >
              <div className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4 text-primary" /> Group Practice Member</div>
              <p className="mt-1 text-xs text-muted-foreground">Payments settle into your practice's account; the practice pays you.</p>
            </button>
          </div>

          {type === "independent" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank name</Label>
                  <Input id="bank_name" value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_name">Account holder</Label>
                  <Input id="account_name" value={bank.account_name} onChange={(e) => setBank({ ...bank, account_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_number">Account number</Label>
                  <Input id="account_number" value={bank.account_number} onChange={(e) => setBank({ ...bank, account_number: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bhf_number">BHF practice number (optional)</Label>
                  <Input id="bhf_number" value={bank.bhf_number} onChange={(e) => setBank({ ...bank, bhf_number: e.target.value })} placeholder="Required only for medical aid claims" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={saveIndependent} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save banking details
                </Button>
                <Badge variant={doctor?.paystack_subaccount_code ? "default" : "outline"}>
                  {doctor?.paystack_subaccount_code ? "Payout account active" : "Awaiting admin approval"}
                </Badge>
              </div>
            </div>
          )}

          {type === "group_member" && (
            <div className="space-y-3">
              {doctor?.practice_id ? (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <div className="font-medium">{practiceName || "Your practice"}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {approvalStatus === "approved"
                      ? "Approved — payments settle into the practice account."
                      : "Awaiting approval from the practice owner."}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search approved practices by name or number"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchPractices(); } }}
                    />
                    <Button type="button" variant="outline" onClick={searchPractices} disabled={searching}>
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {results.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                        <div>
                          <div className="font-medium">{p.practice_name}</div>
                          <div className="text-xs text-muted-foreground">
                            Practice #{p.practice_number}{p.bhf_number ? ` · BHF ${p.bhf_number}` : ""}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => joinPractice(p.id)} disabled={saving}>Request to join</Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PracticeStructureCard;
