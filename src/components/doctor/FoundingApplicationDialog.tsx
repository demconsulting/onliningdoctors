import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Crown, Loader2 } from "lucide-react";
import { useFoundingSlots } from "@/hooks/useFoundingSlots";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  defaultSpecialty?: string;
  onSubmitted?: () => void;
}

const FoundingApplicationDialog = ({ open, onOpenChange, userId, defaultSpecialty, onSubmitted }: Props) => {
  const { toast } = useToast();
  const { slots } = useFoundingSlots();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    motivation: "",
    years_experience: "",
    specialty: defaultSpecialty || "",
    availability: "",
  });

  const isFull = slots && slots.remaining <= 0;
  const isClosed = slots && !slots.applications_open;
  const isWaitlist = isFull || isClosed;

  const submit = async () => {
    if (!form.motivation || form.motivation.length < 30) {
      toast({ title: "Please share more about your motivation", description: "At least 30 characters.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("founding_doctor_applications" as any).insert({
      doctor_id: userId,
      motivation: form.motivation,
      years_experience: form.years_experience ? parseInt(form.years_experience, 10) : null,
      specialty: form.specialty || null,
      availability: form.availability || null,
      status: isWaitlist ? "waitlist" : "pending",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: isWaitlist ? "Added to waitlist" : "Application submitted",
      description: isWaitlist
        ? "We'll notify you if a founding slot opens up."
        : "Our team will review your application shortly.",
    });
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Crown className="h-5 w-5 text-primary" />
            Apply for the Founding 10 Doctors Program
          </DialogTitle>
          <DialogDescription>
            Exclusive locked-in pricing, premium features, and partnership status — reserved for our first 10 founding doctors.
            {slots && (
              <span className="mt-2 block font-semibold text-foreground">
                {isClosed ? "Applications are currently closed." :
                 isFull ? "All 10 founding slots are filled — joining the waitlist." :
                 `${slots.remaining} of ${slots.max_slots} founding positions remaining`}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="motivation">Why should you be a founding doctor? *</Label>
            <Textarea id="motivation" rows={4} value={form.motivation}
              onChange={(e) => setForm({ ...form, motivation: e.target.value })}
              placeholder="Tell us about your practice, what excites you about telemedicine, and how you'll help shape the platform..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="years">Years of experience</Label>
              <Input id="years" type="number" min={0} value={form.years_experience}
                onChange={(e) => setForm({ ...form, years_experience: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Specialty</Label>
              <Input id="specialty" value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="availability">Weekly availability</Label>
            <Input id="availability" placeholder="e.g. 15 hours / week — evenings & weekends"
              value={form.availability}
              onChange={(e) => setForm({ ...form, availability: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isWaitlist ? "Join waitlist" : "Submit application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FoundingApplicationDialog;
