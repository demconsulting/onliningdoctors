import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, Eye, EyeOff, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const AdminReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*, patient:patient_id(full_name), doctor:doctor_id(full_name)")
      .order("created_at", { ascending: false });
    if (data) {
      setReviews(data);
      const notes: Record<string, string> = {};
      data.forEach((r: any) => { notes[r.id] = r.admin_notes || ""; });
      setAdminNotes(notes);
    }
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, []);

  const toggleVisibility = async (id: string, current: boolean) => {
    await supabase.from("reviews").update({ is_visible: !current }).eq("id", id);
    toast({ title: !current ? "Review made visible" : "Review hidden" });
    fetchReviews();
  };

  const deleteReview = async (id: string) => {
    await supabase.from("reviews").delete().eq("id", id);
    toast({ title: "Review deleted" });
    fetchReviews();
  };

  const saveAdminNote = async (id: string) => {
    await supabase.from("reviews").update({ admin_notes: adminNotes[id] }).eq("id", id);
    toast({ title: "Admin note saved" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Star className="h-5 w-5 text-primary" /> Reviews Moderation ({reviews.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
        {reviews.map((r) => (
          <div key={r.id} className={`rounded-lg border p-4 space-y-2 ${r.is_visible ? "border-border" : "border-destructive/30 bg-destructive/5"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-3.5 w-3.5 ${r.rating >= s ? "fill-warning text-warning" : "text-muted-foreground/20"}`} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                {!r.is_visible && <span className="text-xs text-destructive font-medium">Hidden</span>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleVisibility(r.id, r.is_visible)}>
                  {r.is_visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteReview(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-foreground">{r.comment || <em className="text-muted-foreground">No comment</em>}</p>
            <p className="text-xs text-muted-foreground">By: {r.patient?.full_name || "Patient"} → Dr. {r.doctor?.full_name || "Doctor"}</p>
            <div className="pt-1 space-y-1">
              <Textarea
                value={adminNotes[r.id] || ""}
                onChange={(e) => setAdminNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                rows={1}
                placeholder="Admin note..."
                className="text-xs"
              />
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => saveAdminNote(r.id)}>Save Note</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AdminReviews;
