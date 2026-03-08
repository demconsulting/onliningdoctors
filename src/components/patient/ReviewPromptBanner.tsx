import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReviewForm from "@/components/reviews/ReviewForm";
import type { User } from "@supabase/supabase-js";

interface ReviewPromptBannerProps {
  user: User;
  onSwitchToAppointments?: () => void;
}

const ReviewPromptBanner = ({ user, onSwitchToAppointments }: ReviewPromptBannerProps) => {
  const [pending, setPending] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetch = async () => {
      const [aptRes, revRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, doctor_id, scheduled_at, doctor:doctor_id(full_name)")
          .eq("patient_id", user.id)
          .eq("status", "completed")
          .order("scheduled_at", { ascending: false }),
        supabase
          .from("reviews")
          .select("appointment_id")
          .eq("patient_id", user.id),
      ]);

      const reviewedSet = new Set((revRes.data || []).map((r: any) => r.appointment_id));
      const unreviewed = (aptRes.data || []).filter((a: any) => !reviewedSet.has(a.id));
      setPending(unreviewed);
    };
    fetch();
  }, [user.id]);

  const visible = pending.filter((p) => !dismissed.has(p.id));

  if (visible.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 space-y-3"
      >
        {visible.map((apt) => (
          <div
            key={apt.id}
            className="relative rounded-lg border border-warning/30 bg-warning/5 p-4"
          >
            <button
              onClick={() => setDismissed((s) => new Set(s).add(apt.id))}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 fill-warning text-warning shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  How was your appointment with {apt.doctor?.full_name || "your doctor"}?
                </p>
                <p className="text-xs text-muted-foreground">
                  Your feedback helps other patients find the right care.
                </p>
              </div>
              {expandedId !== apt.id && (
                <button
                  onClick={() => setExpandedId(apt.id)}
                  className="shrink-0 rounded-md bg-warning/20 px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/30 transition-colors"
                >
                  Leave Review
                </button>
              )}
            </div>

            <AnimatePresence>
              {expandedId === apt.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 overflow-hidden"
                >
                  <ReviewForm
                    user={user}
                    appointmentId={apt.id}
                    doctorId={apt.doctor_id}
                    onSubmitted={() => {
                      setPending((p) => p.filter((a) => a.id !== apt.id));
                      setExpandedId(null);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default ReviewPromptBanner;
