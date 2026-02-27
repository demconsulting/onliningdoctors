import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, BarChart3, Plus, Trash2, Save, Pencil, X, Check } from "lucide-react";
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

const AdminStats = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchStats = async () => {
    const { data } = await supabase.from("hero_stats").select("*").order("sort_order");
    if (data) setStats(data);
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const addStat = async () => {
    if (!newLabel.trim() || !newValue.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("hero_stats").insert({
      label: newLabel.trim(),
      value: newValue.trim(),
      icon: newIcon.trim() || null,
      sort_order: stats.length,
    });
    setAdding(false);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else {
      toast({ title: "Stat added" });
      setNewLabel(""); setNewValue(""); setNewIcon("");
      fetchStats();
    }
  };

  const deleteStat = async (id: string) => {
    await supabase.from("hero_stats").delete().eq("id", id);
    toast({ title: "Stat deleted" });
    fetchStats();
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditLabel(s.label);
    setEditValue(s.value);
    setEditIcon(s.icon || "");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editingId || !editLabel.trim() || !editValue.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("hero_stats").update({
      label: editLabel.trim(),
      value: editValue.trim(),
      icon: editIcon.trim() || null,
    }).eq("id", editingId);
    setSaving(false);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else {
      toast({ title: "Stat updated" });
      setEditingId(null);
      fetchStats();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = stats.findIndex((s) => s.id === active.id);
    const newIdx = stats.findIndex((s) => s.id === over.id);
    setStats(arrayMove(stats, oldIdx, newIdx));
  };

  const saveOrder = async () => {
    setSaving(true);
    const updates = stats.map((s, i) =>
      supabase.from("hero_stats").update({ sort_order: i }).eq("id", s.id)
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
          <BarChart3 className="h-5 w-5 text-primary" /> Stats ({stats.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Add New Stat</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label (e.g. Doctors)" />
            <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Value (e.g. 500+)" />
            <Input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="Icon (e.g. UserCheck)" />
          </div>
          <Button onClick={addStat} disabled={adding} size="sm" className="gap-1">
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stats.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {stats.map((s) => (
                <SortableItem key={s.id} id={s.id}>
                  {editingId === s.id ? (
                    <div className="rounded-lg border border-primary p-3 space-y-2">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="Label" />
                        <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Value" />
                        <Input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} placeholder="Icon" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} disabled={saving} className="gap-1">
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="gap-1">
                          <X className="h-3 w-3" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.value} — {s.label}</p>
                        {s.icon && <p className="text-xs text-muted-foreground">Icon: {s.icon}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteStat(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {stats.length > 1 && (
          <Button onClick={saveOrder} disabled={saving} variant="outline" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Order
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminStats;
