import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Match {
  id: string;
  practice_id: string | null;
  doctor_id: string | null;
  doctor_name: string | null;
  practice_name: string | null;
  date_of_birth_year: number | null;
  created_at: string;
}

interface Props { user: User; }

const PracticePatientLinkPrompt = ({ user }: Props) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await supabase.rpc("find_matching_practice_patients");
    if (error || !data) return;
    const list = data as Match[];
    if (list.length > 0) { setMatches(list); setOpen(true); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user.id]);

  const link = async (id: string) => {
    setActing(id);
    const { error } = await supabase.rpc("link_practice_patient", { _practice_patient_id: id });
    setActing(null);
    if (error) { toast({ variant: "destructive", title: "Couldn't link", description: error.message }); return; }
    toast({ title: "Linked", description: "Your account is now linked to the practice record." });
    setMatches((m) => m.filter((x) => x.id !== id));
    if (matches.length <= 1) setOpen(false);
  };

  const deny = async (id: string) => {
    setActing(id);
    const { error } = await supabase.rpc("deny_practice_patient", { _practice_patient_id: id });
    setActing(null);
    if (error) { toast({ variant: "destructive", title: "Error", description: error.message }); return; }
    setMatches((m) => m.filter((x) => x.id !== id));
    if (matches.length <= 1) setOpen(false);
  };

  if (matches.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" /> We found an existing practice profile
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            One of your doctors has an existing patient record that matches your ID. Link it to your account so they can see your online appointments alongside the offline history.
          </p>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <span>We only share your account with this doctor once you tap <strong>Link my account</strong>. No medical records are exposed before then.</span>
          </div>

          {matches.map((m) => (
            <div key={m.id} className="rounded-lg border border-border p-3 space-y-2">
              <p className="font-medium text-foreground">
                {m.practice_name || (m.doctor_name ? `Dr. ${m.doctor_name}` : "Practice record")}
              </p>
              <p className="text-xs text-muted-foreground">
                {m.doctor_name && `Dr. ${m.doctor_name} · `}
                {m.date_of_birth_year ? `DOB: ${m.date_of_birth_year}` : ""}
              </p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="gradient-primary border-0 text-primary-foreground" disabled={acting === m.id} onClick={() => link(m.id)}>
                  {acting === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link my account"}
                </Button>
                <Button size="sm" variant="outline" disabled={acting === m.id} onClick={() => deny(m.id)}>Not me</Button>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Decide later</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PracticePatientLinkPrompt;
