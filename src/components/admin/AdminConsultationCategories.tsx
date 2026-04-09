import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Tag, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id?: string;
  name: string;
  description: string;
  min_price: number;
  max_price: number;
  is_active: boolean;
  sort_order: number;
}

const AdminConsultationCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("consultation_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setCategories(data.map(c => ({ ...c, description: c.description || "" })));
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const addCategory = () => {
    setCategories(prev => [...prev, {
      name: "", description: "", min_price: 0, max_price: 0,
      is_active: true, sort_order: prev.length + 1,
    }]);
  };

  const updateCategory = (index: number, updates: Partial<Category>) => {
    setCategories(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const removeCategory = async (index: number) => {
    const cat = categories[index];
    if (cat.id) {
      const { error } = await supabase.from("consultation_categories").delete().eq("id", cat.id);
      if (error) {
        toast({ variant: "destructive", title: "Cannot delete", description: "Category may be in use by doctors." });
        return;
      }
    }
    setCategories(prev => prev.filter((_, i) => i !== index));
    toast({ title: "Category removed" });
  };

  const handleSave = async () => {
    setSaving(true);
    for (const cat of categories) {
      if (!cat.name || cat.min_price <= 0 || cat.max_price <= 0 || cat.min_price > cat.max_price) {
        toast({ variant: "destructive", title: "Validation error", description: "Each category needs a name, and min price must be less than max price." });
        setSaving(false);
        return;
      }

      const data = {
        name: cat.name,
        description: cat.description || null,
        min_price: cat.min_price,
        max_price: cat.max_price,
        is_active: cat.is_active,
        sort_order: cat.sort_order,
      };

      if (cat.id) {
        await supabase.from("consultation_categories").update(data).eq("id", cat.id);
      } else {
        await supabase.from("consultation_categories").insert(data);
      }
    }
    setSaving(false);
    toast({ title: "Categories saved" });
    fetchCategories();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Tag className="h-5 w-5 text-primary" /> Consultation Categories & Price Bands
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Define consultation categories with allowed price ranges. Doctors must select a category and set their fee within the specified band.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">No categories yet. Add one below.</p>
        )}

        {categories.map((cat, i) => (
          <div key={cat.id || i} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch checked={cat.is_active} onCheckedChange={(v) => updateCategory(i, { is_active: v })} />
                <Badge variant={cat.is_active ? "default" : "secondary"}>
                  {cat.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeCategory(i)} className="text-destructive h-8 w-8">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Category Name</Label>
                <Input value={cat.name} onChange={(e) => updateCategory(i, { name: e.target.value })} placeholder="e.g. General Consultation" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sort Order</Label>
                <Input type="number" min={0} value={cat.sort_order} onChange={(e) => updateCategory(i, { sort_order: Number(e.target.value) })} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Min Price (R)</Label>
                <Input type="number" min={0} value={cat.min_price} onChange={(e) => updateCategory(i, { min_price: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Price (R)</Label>
                <Input type="number" min={0} value={cat.max_price} onChange={(e) => updateCategory(i, { max_price: Number(e.target.value) })} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description (shown to patients)</Label>
              <Textarea value={cat.description} onChange={(e) => updateCategory(i, { description: e.target.value })} rows={2} placeholder="Describe what this category covers..." />
            </div>

            {cat.min_price > 0 && cat.max_price > 0 && (
              <p className="text-xs text-muted-foreground">
                Doctors in this category can charge between <span className="font-semibold text-foreground">R{cat.min_price}</span> and <span className="font-semibold text-foreground">R{cat.max_price}</span>
              </p>
            )}
          </div>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" onClick={addCategory} className="gap-1">
            <Plus className="h-4 w-4" /> Add Category
          </Button>
          {categories.length > 0 && (
            <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary border-0 text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save All
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminConsultationCategories;
