import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Loader2, ThumbsUp, ThumbsDown, UserCheck } from "lucide-react";
import { format } from "date-fns";

interface ReviewListProps {
  doctorId: string;
}

const ReviewList = ({ doctorId }: ReviewListProps) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Query reviews WITHOUT joining patient profile — anonymous display
    supabase
      .from("reviews")
      .select("id, rating, comment, doctor_clear_helpful, doctor_professional, would_recommend, created_at")
      .eq("doctor_id", doctorId)
      .eq("is_visible", true)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReviews(data);
        setLoading(false);
      });
  }, [doctorId]);

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  if (reviews.length === 0) return null;

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const recommendPct = reviews.filter(r => r.would_recommend === true).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-display">
          <Star className="h-4 w-4 fill-warning text-warning" />
          Patient Reviews ({reviews.length}) — {avgRating.toFixed(1)} avg
        </CardTitle>
        {recommendPct > 0 && (
          <p className="text-xs text-muted-foreground">
            {Math.round((recommendPct / reviews.length) * 100)}% of patients would recommend this doctor
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-3.5 w-3.5 ${r.rating >= s ? "fill-warning text-warning" : "text-muted-foreground/20"}`} />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(r.created_at), "MMM d, yyyy")}
              </span>
            </div>

            {/* Yes/No indicators */}
            <div className="flex flex-wrap gap-2">
              {r.doctor_clear_helpful !== null && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${r.doctor_clear_helpful ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                  {r.doctor_clear_helpful ? <ThumbsUp className="h-2.5 w-2.5" /> : <ThumbsDown className="h-2.5 w-2.5" />} Clear & Helpful
                </span>
              )}
              {r.doctor_professional !== null && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${r.doctor_professional ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                  {r.doctor_professional ? <ThumbsUp className="h-2.5 w-2.5" /> : <ThumbsDown className="h-2.5 w-2.5" />} Professional
                </span>
              )}
              {r.would_recommend !== null && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${r.would_recommend ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                  {r.would_recommend ? <ThumbsUp className="h-2.5 w-2.5" /> : <ThumbsDown className="h-2.5 w-2.5" />} Recommend
                </span>
              )}
            </div>

            {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <UserCheck className="h-3 w-3" /> Verified Patient
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ReviewList;
