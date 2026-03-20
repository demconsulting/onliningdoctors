import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Loader2, Eye, EyeOff, Trash2, ShieldAlert, CheckCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const AdminReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("flagged");
  const { toast } = useToast();

  const fetchReviews = async () => {
    // Admin can see patient identity internally
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

  const approveReview = async (id: string) => {
    await supabase.from("reviews").update({ moderation_status: "approved", is_visible: true }).eq("id", id);
    toast({ title: "Review approved and made visible" });
    fetchReviews();
  };

  const rejectReview = async (id: string) => {
    await supabase.from("reviews").update({ moderation_status: "rejected", is_visible: false }).eq("id", id);
    toast({ title: "Review rejected" });
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

  const filtered = filter === "all" ? reviews
    : filter === "flagged" ? reviews.filter(r => r.moderation_status === "pending")
    : reviews.filter(r => r.moderation_status === filter);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const flaggedCount = reviews.filter(r => r.moderation_status === "pending").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 font-display">
            <Star className="h-5 w-5 text-primary" /> Reviews Moderation
            {flaggedCount > 0 && (
              <Badge variant="destructive" className="text-xs">{flaggedCount} flagged</Badge>
            )}
          </CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="flagged">Flagged ({flaggedCount})</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All ({reviews.length})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No reviews in this category.</p>}
        {filtered.map((r) => (
          <div key={r.id} className={`rounded-lg border p-4 space-y-2 ${
            r.moderation_status === "pending" ? "border-warning/50 bg-warning/5" :
            r.moderation_status === "rejected" ? "border-destructive/30 bg-destructive/5" :
            "border-border"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-3.5 w-3.5 ${r.rating >= s ? "fill-warning text-warning" : "text-muted-foreground/20"}`} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                <Badge variant={r.moderation_status === "pending" ? "outline" : r.moderation_status === "approved" ? "secondary" : "destructive"} className="text-[10px]">
                  {r.moderation_status === "pending" && <ShieldAlert className="h-3 w-3 mr-1" />}
                  {r.moderation_status}
                </Badge>
                {!r.is_visible && <span className="text-xs text-destructive font-medium">Hidden</span>}
              </div>
              <div className="flex gap-1">
                {r.moderation_status === "pending" && (
                  <>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => approveReview(r.id)} title="Approve">
                      <CheckCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => rejectReview(r.id)} title="Reject">
                      <ShieldAlert className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleVisibility(r.id, r.is_visible)}>
                  {r.is_visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteReview(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Yes/No answers */}
            <div className="flex flex-wrap gap-2">
              {r.doctor_clear_helpful !== null && (
                <span className={`inline-flex items-center gap-1 text-[10px] ${r.doctor_clear_helpful ? "text-primary" : "text-destructive"}`}>
                  {r.doctor_clear_helpful ? <ThumbsUp className="h-2.5 w-2.5" /> : <ThumbsDown className="h-2.5 w-2.5" />} Clear & Helpful
                </span>
              )}
              {r.doctor_professional !== null && (
                <span className={`inline-flex items-center gap-1 text-[10px] ${r.doctor_professional ? "text-primary" : "text-destructive"}`}>
                  {r.doctor_professional ? <ThumbsUp className="h-2.5 w-2.5" /> : <ThumbsDown className="h-2.5 w-2.5" />} Professional
                </span>
              )}
              {r.would_recommend !== null && (
                <span className={`inline-flex items-center gap-1 text-[10px] ${r.would_recommend ? "text-primary" : "text-destructive"}`}>
                  {r.would_recommend ? <ThumbsUp className="h-2.5 w-2.5" /> : <ThumbsDown className="h-2.5 w-2.5" />} Recommend
                </span>
              )}
            </div>

            {r.flagged_reason && (
              <p className="text-xs text-warning font-medium">⚠️ {r.flagged_reason}</p>
            )}

            <p className="text-sm text-foreground">{r.comment || <em className="text-muted-foreground">No comment</em>}</p>

            {/* Admin-only: patient identity (never shown publicly) */}
            <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground border border-border">
              <span className="font-medium text-foreground">🔒 Internal:</span>{" "}
              Patient: {r.patient?.full_name || "Unknown"} → Dr. {r.doctor?.full_name || "Unknown"}
            </div>

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
