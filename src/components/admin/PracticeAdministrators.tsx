import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, UserMinus } from "lucide-react";
import { toast } from "sonner";

type Administrator = { id: string; user_id: string; full_name: string; email: string };

export default function PracticeAdministrators({ practiceId }: { practiceId: string }) {
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<Administrator | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_group_practice_admins", { _practice_id: practiceId });
    setError(error?.message || "");
    setAdministrators(data || []);
    setLoading(false);
  }, [practiceId]);
  useEffect(() => { setAdministrators([]); setRemoving(null); void load(); }, [load]);
  const assign = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("assign_group_practice_admin", { _practice_id: practiceId, _email: email.trim() });
    if (error) toast.error(error.message);
    else { setEmail(""); toast.success("Practice administrator assigned"); await load(); }
    setBusy(false);
  };
  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    const { error } = await supabase.rpc("remove_group_practice_admin", { _practice_id: practiceId, _user_id: removing.user_id });
    if (error) toast.error(error.message);
    else { toast.success("Practice administrator removed"); setRemoving(null); await load(); }
    setBusy(false);
  };
  return <section className="max-w-2xl space-y-4 border-t border-border pt-6">
    <h2 className="font-display text-lg font-semibold">Practice administrators</h2>
    <form onSubmit={assign} className="space-y-2">
      <Label htmlFor="practice-admin-email">Existing account email</Label>
      <div className="flex flex-wrap gap-2"><Input id="practice-admin-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} className="min-w-0 flex-1" disabled={busy} /><Button type="submit" disabled={busy}>Assign administrator</Button></div>
    </form>
    {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Loading administrators" /> : error ? <p role="alert" className="text-destructive">{error}</p> : !administrators.length ? <p className="text-sm text-muted-foreground">No administrators assigned.</p> : administrators.map(admin => <div key={admin.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"><div className="min-w-0"><p className="font-medium">{admin.full_name}</p><p className="break-all text-sm text-muted-foreground">{admin.email}</p></div><Button variant="outline" disabled={busy} onClick={() => setRemoving(admin)} className="gap-2"><UserMinus className="h-4 w-4" />Remove administrator</Button></div>)}
    <AlertDialog open={Boolean(removing)} onOpenChange={open => { if (!open && !busy) setRemoving(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove administrator?</AlertDialogTitle><AlertDialogDescription>{removing?.full_name} will lose administrator access to this practice. Any other assigned practices remain unchanged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={event => { event.preventDefault(); void remove(); }}>Remove administrator</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}