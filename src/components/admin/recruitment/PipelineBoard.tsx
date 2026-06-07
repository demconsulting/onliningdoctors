import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { PIPELINE_STAGES } from "./templates";
import { Mail, MessageCircle, Phone } from "lucide-react";

interface Props {
  prospects: any[];
  stageCounts?: Record<string, number>;
  onStageChange: (id: string, stage: string) => void;
  onOpen: (p: any) => void;
}

const Card = ({ p, onOpen }: { p: any; onOpen: (p: any) => void }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: p.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(p)}
      className={`rounded-md border bg-card p-2.5 text-left text-xs shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition ${isDragging ? "opacity-40" : ""}`}
    >
      <p className="font-semibold text-sm">{p.title || ""} {p.first_name} {p.last_name}</p>
      {p.specialty && <p className="text-muted-foreground">{p.specialty}</p>}
      {(p.city || p.province) && <p className="text-muted-foreground">{[p.city, p.province].filter(Boolean).join(", ")}</p>}
      <div className="flex gap-1.5 mt-1.5 text-muted-foreground">
        {p.email && <Mail className="h-3 w-3" />}
        {p.whatsapp_number && <MessageCircle className="h-3 w-3 text-emerald-500" />}
        {p.mobile_number && <Phone className="h-3 w-3" />}
      </div>
    </div>
  );
};

const Column = ({ stage, items, count, onOpen }: { stage: typeof PIPELINE_STAGES[number]; items: any[]; count: number; onOpen: (p: any) => void }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  return (
    <div ref={setNodeRef} className={`flex-shrink-0 w-64 rounded-lg border bg-muted/30 p-2 flex flex-col gap-2 ${isOver ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${stage.color}`} />
          <span className="text-sm font-semibold">{stage.label}</span>
        </div>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div className="space-y-2 min-h-[80px]">
        {items.map(p => <Card key={p.id} p={p} onOpen={onOpen} />)}
      </div>
    </div>
  );
};

const PipelineBoard = ({ prospects, stageCounts = {}, onStageChange, onOpen }: Props) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const grouped = useMemo(() => {
    const m: Record<string, any[]> = {};
    PIPELINE_STAGES.forEach(s => m[s.key] = []);
    prospects.forEach(p => { (m[p.stage] ||= []).push(p); });
    return m;
  }, [prospects]);

  const active = activeId ? prospects.find(p => p.id === activeId) : null;

  const handleEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id as string | undefined;
    if (!overId) return;
    const p = prospects.find(x => x.id === e.active.id);
    if (p && p.stage !== overId && PIPELINE_STAGES.some(s => s.key === overId)) {
      onStageChange(p.id, overId);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)} onDragEnd={handleEnd}>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {PIPELINE_STAGES.map(s => <Column key={s.key} stage={s} items={grouped[s.key] || []} count={Math.max((grouped[s.key] || []).length, stageCounts[s.key] || 0)} onOpen={onOpen} />)}
      </div>
      <DragOverlay>{active && <Card p={active} onOpen={() => {}} />}</DragOverlay>
    </DndContext>
  );
};

export default PipelineBoard;
