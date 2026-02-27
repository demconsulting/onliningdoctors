import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Stethoscope, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminSpecialties = () => {
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const fetch = async () => {
    const { data } = await supabase.from("specialties").select("*").order("name");
    if (data) setSpecialties(data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

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
      fetch();
    }
  };

  const deleteSpecialty = async (id: string) => {
    await supabase.from("specialties").delete().eq("id", id);
    toast({ title: "Specialty deleted" });
    fetch();
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

        <div className="divide-y divide-border">
          {specialties.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSpecialty(s.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSpecialties;
