import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Loader2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface ReviewFormProps {
  user: User;
  appointmentId: string;
  doctorId: string;
  onSubmitted?: () => void;
  /** Pass existing review data to enable edit mode */
  existingReview?: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
  };
}

const ReviewForm = ({ user, appointmentId, doctorId, onSubmitted, existingReview }: ReviewFormProps) => {
  const isEditing = !!existingReview;
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || "");
    }
  }, [existingReview]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ variant: "destructive", title: "Please select a rating" });
      return;
    }

    setLoading(true);

    if (isEditing && existingReview) {
      // Check 24-hour window
      const hoursElapsed = (Date.now() - new Date(existingReview.created_at).getTime()) / 3600000;
      if (hoursElapsed > 24) {
        toast({ variant: "destructive", title: "Edit window expired", description: "Reviews can only be edited within 24 hours of submission." });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("reviews")
        .update({ rating, comment: comment.trim() || null })
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
        rating,
        comment: comment.trim() || null,
      });

      setLoading(false);
      if (error) {
        if (error.code === "23505") {
          toast({ variant: "destructive", title: "You already reviewed this appointment" });
        } else {
          toast({ variant: "destructive", title: "Error", description: error.message });
        }
      } else {
        toast({ title: "Review submitted! Thank you." });
        onSubmitted?.();
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-display">
          {isEditing ? "Edit Your Review" : "Leave a Review"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience (optional)..."
          rows={3}
          maxLength={1000}
        />
        <Button onClick={handleSubmit} disabled={loading} size="sm" className="gap-2 gradient-primary border-0 text-primary-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? <Pencil className="h-4 w-4" /> : <Star className="h-4 w-4" />}
          {isEditing ? "Update Review" : "Submit Review"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
