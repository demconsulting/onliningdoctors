import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Search, Link2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import PracticePatientForm from "./PracticePatientForm";
import PracticePatientDetail from "./PracticePatientDetail";

interface Props { user: User; }

export interface PracticePatient {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  id_type: string | null;
  id_country_code: string | null;
  id_last_four: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  medical_notes: string | null;
  linked_user_id: string | null;
  consent_status: string;
  practice_id: string | null;
  doctor_id: string | null;
  created_at: string;
}

const PracticePatients = ({ user }: Props) => {
  const [items, setItems] = useState<PracticePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PracticePatient | null>(null);
  const [detail, setDetail] = useState<PracticePatient | null>(null);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("practice_patients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    setItems((data as PracticePatient[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
    supabase.from("doctors").select("practice_id").eq("profile_id", user.id).maybeSingle()
      .then(({ data }) => setPracticeId(data?.practice_id || null));
    supabase.from("profiles").select("country").eq("id", user.id).maybeSingle()
      .then(({ data }) => setCountry(data?.country || null));
  }, [user.id, load]);

  const filtered = items.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(s) ||
      (p.phone || "").toLowerCase().includes(s) ||
      (p.email || "").toLowerCase().includes(s) ||
      (p.id_last_four || "").includes(s)
    );
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="font-display">Practice Patients</CardTitle>
          <p className="text-sm text-muted-foreground">Manage offline patients and link them once they register.</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2 gradient-primary border-0 text-primary-foreground">
          <UserPlus className="h-4 w-4" /> Add Patient
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email or last 4 of ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No practice patients yet.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/30">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{p.full_name}</p>
                    {p.linked_user_id && p.consent_status === "granted" ? (
                      <Badge variant="default" className="gap-1"><Link2 className="h-3 w-3" /> Linked</Badge>
                    ) : p.consent_status === "denied" ? (
                      <Badge variant="destructive">Declined</Badge>
                    ) : (
                      <Badge variant="secondary">Offline</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {[p.phone, p.email, p.date_of_birth, p.id_last_four && `ID •••${p.id_last_four}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDetail(p)}>View</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setFormOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <PracticePatientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        userId={user.id}
        practiceId={practiceId}
        defaultCountry={country}
        onSaved={() => { setFormOpen(false); load(); }}
      />

      <PracticePatientDetail
        patient={detail}
        onOpenChange={(o) => !o && setDetail(null)}
        onChanged={load}
      />
    </Card>
  );
};

export default PracticePatients;
