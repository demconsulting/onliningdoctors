import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Stethoscope, Plus, Trash2 } from "lucide-react";
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

const AdminSpecialties = () => {
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchSpecialties = async () => {
    const { data } = await supabase.from("specialties").select("*").order("name");
    if (data) setSpecialties(data);
    setLoading(false);
  };

  useEffect(() => { fetchSpecialties(); }, []);

  const addSpecialty = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("specialties").insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      icon: newIcon.trim() || null,
    });
    setAdding(false);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else {
      toast({ title: "Specialty added" });
      setNewName(""); setNewDesc(""); setNewIcon("");
      fetchSpecialties();
    }
  };

  const deleteSpecialty = async (id: string) => {
    if (!confirm("Are you sure you want to delete this specialty? It will fail if any doctors are assigned to it.")) return;
    const { error } = await supabase.from("specialties").delete().eq("id", id);
    if (error) {
      const msg = error.message.includes("foreign key") || error.message.includes("violates")
        ? "Cannot delete: doctors are still assigned to this specialty."
        : error.message;
      toast({ variant: "destructive", title: "Error deleting", description: msg });
    } else {
      toast({ title: "Specialty deleted" });
      fetchSpecialties();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = specialties.findIndex((s) => s.id === active.id);
    const newIdx = specialties.findIndex((s) => s.id === over.id);
    setSpecialties(arrayMove(specialties, oldIdx, newIdx));
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Stethoscope className="h-5 w-5 text-primary" /> Specialties ({specialties.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Add New Specialty</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" />
            <Input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="Icon name (e.g. Heart)" />
            <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" rows={1} />
          </div>
          <Button onClick={addSpecialty} disabled={adding} size="sm" className="gap-1">
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={specialties.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {specialties.map((s) => (
                <SortableItem key={s.id} id={s.id}>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSpecialty(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
};

export default AdminSpecialties;
