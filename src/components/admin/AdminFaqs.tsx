import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, HelpCircle, Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableItem from "./SortableItem";

const AdminFaqs = () => {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchFaqs = async () => {
    const { data } = await supabase.from("faqs").select("*").order("sort_order");
    if (data) setFaqs(data);
    setLoading(false);
  };

  useEffect(() => { fetchFaqs(); }, []);

  const addFaq = async () => {
    if (!newQ.trim() || !newA.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("faqs").insert({
      question: newQ.trim(),
      answer: newA.trim(),
      sort_order: faqs.length,
    });
    setAdding(false);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else {
      toast({ title: "FAQ added" });
      setNewQ(""); setNewA("");
      fetchFaqs();
    }
  };

  const deleteFaq = async (id: string) => {
    await supabase.from("faqs").delete().eq("id", id);
    toast({ title: "FAQ deleted" });
    fetchFaqs();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = faqs.findIndex((f) => f.id === active.id);
    const newIdx = faqs.findIndex((f) => f.id === over.id);
    setFaqs(arrayMove(faqs, oldIdx, newIdx));
  };

  const saveOrder = async () => {
    setSaving(true);
    const updates = faqs.map((f, i) =>
      supabase.from("faqs").update({ sort_order: i }).eq("id", f.id)
    );
    await Promise.all(updates);
    setSaving(false);
    toast({ title: "Order saved" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <HelpCircle className="h-5 w-5 text-primary" /> FAQs ({faqs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Add New FAQ</p>
          <Input value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Question" />
          <Textarea value={newA} onChange={(e) => setNewA(e.target.value)} placeholder="Answer" rows={2} />
          <Button onClick={addFaq} disabled={adding} size="sm" className="gap-1">
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add FAQ
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={faqs.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {faqs.map((f) => (
                <SortableItem key={f.id} id={f.id}>
                  <div className="flex items-start justify-between rounded-lg border border-border p-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{f.question}</p>
                      <p className="text-xs text-muted-foreground">{f.answer}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => deleteFaq(f.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {faqs.length > 1 && (
          <Button onClick={saveOrder} disabled={saving} variant="outline" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Order
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminFaqs;
