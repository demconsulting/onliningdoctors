import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ReviewListProps {
  doctorId: string;
}

const ReviewList = ({ doctorId }: ReviewListProps) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("*, patient:patient_id(full_name)")
      .eq("doctor_id", doctorId)
      .eq("is_visible", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReviews(data);
        setLoading(false);
      });
  }, [doctorId]);

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  if (reviews.length === 0) return null;

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-display">
          <Star className="h-4 w-4 fill-warning text-warning" />
          Reviews ({reviews.length}) — {avgRating.toFixed(1)} avg
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-lg border border-border p-3 space-y-1">
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
            {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
            <p className="text-xs text-muted-foreground">— {r.patient?.full_name || "Patient"}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ReviewList;
