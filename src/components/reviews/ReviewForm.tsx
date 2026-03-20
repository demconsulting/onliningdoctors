import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Loader2, Pencil, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface ReviewFormProps {
  user: User;
  appointmentId: string;
  doctorId: string;
  onSubmitted?: () => void;
  existingReview?: {
    id: string;
    rating: number;
    comment: string | null;
    doctor_clear_helpful: boolean | null;
    doctor_professional: boolean | null;
    would_recommend: boolean | null;
    created_at: string;
  };
}

const YesNoToggle = ({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-sm text-foreground">{label}</span>
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          value === true ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
        }`}
      >
        <ThumbsUp className="h-3 w-3" /> Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          value === false ? "bg-destructive/15 text-destructive border border-destructive/30" : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
        }`}
      >
        <ThumbsDown className="h-3 w-3" /> No
      </button>
    </div>
  </div>
);

const ReviewForm = ({ user, appointmentId, doctorId, onSubmitted, existingReview }: ReviewFormProps) => {
  const isEditing = !!existingReview;
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [doctorClearHelpful, setDoctorClearHelpful] = useState<boolean | null>(existingReview?.doctor_clear_helpful ?? null);
  const [doctorProfessional, setDoctorProfessional] = useState<boolean | null>(existingReview?.doctor_professional ?? null);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(existingReview?.would_recommend ?? null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || "");
      setDoctorClearHelpful(existingReview.doctor_clear_helpful ?? null);
      setDoctorProfessional(existingReview.doctor_professional ?? null);
      setWouldRecommend(existingReview.would_recommend ?? null);
    }
  }, [existingReview]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ variant: "destructive", title: "Please select a rating" });
      return;
    }
    if (doctorClearHelpful === null || doctorProfessional === null || wouldRecommend === null) {
      toast({ variant: "destructive", title: "Please answer all yes/no questions" });
      return;
    }

    setLoading(true);

    const reviewData = {
      rating,
      comment: comment.trim() || null,
      doctor_clear_helpful: doctorClearHelpful,
      doctor_professional: doctorProfessional,
      would_recommend: wouldRecommend,
    };

    if (isEditing && existingReview) {
      const hoursElapsed = (Date.now() - new Date(existingReview.created_at).getTime()) / 3600000;
      if (hoursElapsed > 24) {
        toast({ variant: "destructive", title: "Edit window expired", description: "Reviews can only be edited within 24 hours of submission." });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("reviews")
        .update(reviewData)
        .eq("id", existingReview.id)
        .eq("patient_id", user.id);

      setLoading(false);
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      } else {
        toast({ title: "Review updated!" });
        onSubmitted?.();
      }
    } else {
      const { error } = await supabase.from("reviews").insert({
        appointment_id: appointmentId,
        patient_id: user.id,
        doctor_id: doctorId,
        ...reviewData,
      });

      setLoading(false);
      if (error) {
        if (error.code === "23505") {
          toast({ variant: "destructive", title: "You already reviewed this appointment" });
        } else {
          toast({ variant: "destructive", title: "Error", description: error.message });
        }
      } else {
        toast({ title: "Review submitted! Thank you.", description: "Your review is anonymous and your identity is never shown publicly." });
        onSubmitted?.();
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-display">
          {isEditing ? "Edit Your Review" : "Leave an Anonymous Review"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Your identity will never be shown publicly.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Overall Rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-6 w-6 ${(hoverRating || rating) >= s ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Yes/No Questions */}
        <div className="space-y-3 rounded-lg border border-border p-3">
          <YesNoToggle label="Was the doctor clear and helpful?" value={doctorClearHelpful} onChange={setDoctorClearHelpful} />
          <YesNoToggle label="Was the doctor professional?" value={doctorProfessional} onChange={setDoctorProfessional} />
          <YesNoToggle label="Would you recommend this doctor?" value={wouldRecommend} onChange={setWouldRecommend} />
        </div>

        {/* Comment */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Short comment (optional, max 250 characters)</p>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 250))}
            placeholder="Share your experience (optional)..."
            rows={3}
            maxLength={250}
          />
          <p className="text-xs text-muted-foreground text-right mt-0.5">{comment.length}/250</p>
        </div>

        <Button onClick={handleSubmit} disabled={loading} size="sm" className="gap-2 gradient-primary border-0 text-primary-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? <Pencil className="h-4 w-4" /> : <Star className="h-4 w-4" />}
          {isEditing ? "Update Review" : "Submit Anonymous Review"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
