import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Layers, GripVertical } from "lucide-react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SectionConfig {
  key: string;
  label: string;
  visible: boolean;
}

const defaultSections: SectionConfig[] = [
  { key: "hero", label: "Hero Section", visible: true },
  { key: "stats", label: "Stats Section", visible: true },
  { key: "why-choose", label: "Why Choose Section", visible: true },
  { key: "find-doctor", label: "Find Doctor Section", visible: true },
  { key: "doctor-cta", label: "Doctor CTA Section", visible: true },
  { key: "faq", label: "FAQ Section", visible: true },
];

const SortableSection = ({
  section,
  onToggle,
}: {
  section: SectionConfig;
  onToggle: (key: string, visible: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="flex-1 font-medium text-foreground">{section.label}</span>
      <Switch
        checked={section.visible}
        onCheckedChange={(checked) => onToggle(section.key, checked)}
      />
    </div>
  );
};

const AdminSectionOrder = () => {
  const [sections, setSections] = useState<SectionConfig[]>(defaultSections);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    supabase
      .from("site_content")
      .select("value")
      .eq("key", "section_order")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const stored = data.value as unknown as SectionConfig[];
          // Merge with defaults to handle new sections
          const storedKeys = new Set(stored.map((s) => s.key));
          const merged = [
            ...stored,
            ...defaultSections.filter((d) => !storedKeys.has(d.key)),
          ];
          setSections(merged);
        }
        setLoading(false);
      });
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((i) => i.key === active.id);
        const newIndex = items.findIndex((i) => i.key === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleVisibility = (key: string, visible: boolean) => {
    setSections((items) =>
      items.map((s) => (s.key === key ? { ...s, visible } : s))
    );
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .upsert(
        { key: "section_order", value: sections as any },
        { onConflict: "key" }
      );
    setSaving(false);
    if (error)
      toast({ variant: "destructive", title: "Error", description: error.message });
    else toast({ title: "Section order updated" });
  };

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Layers className="h-5 w-5 text-primary" /> Section Order
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Drag sections to reorder them on the landing page. Toggle visibility to show or hide sections.
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map((s) => s.key)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sections.map((section) => (
                <SortableSection
                  key={section.key}
                  section={section}
                  onToggle={toggleVisibility}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}{" "}
          Save Order
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminSectionOrder;
