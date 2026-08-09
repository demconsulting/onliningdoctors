import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { FieldDef, ResourceDef, DbRow } from "./resourceConfig";

interface Option { id: string; label: string }

const emptyFor = (def: ResourceDef): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  def.fields.forEach((f) => { out[f.key] = f.type === "boolean" ? false : ""; });
  return out;
};

const formatCell = (value: unknown, field: FieldDef, lookups: { projects: Option[]; doctors: Option[] }) => {
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
  if (field.type === "boolean") return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>;
  if (field.type === "project") return lookups.projects.find((p) => p.id === value)?.label ?? "—";
  if (field.type === "doctor") return lookups.doctors.find((d) => d.id === value)?.label ?? "—";
  if (field.key === "status" || field.key === "verification_status") return <Badge variant="secondary">{String(value)}</Badge>;
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
};

const ResourceManager = ({ def }: { def: ResourceDef }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DbRow | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(emptyFor(def));
  const [projects, setProjects] = useState<Option[]>([]);
  const [doctors, setDoctors] = useState<Option[]>([]);
  const [search, setSearch] = useState("");

  const listFields = useMemo(() => def.fields.filter((f) => f.list), [def]);
  const needsProjects = useMemo(() => def.fields.some((f) => f.type === "project"), [def]);
  const needsDoctors = useMemo(() => def.fields.some((f) => f.type === "doctor"), [def]);

  const load = useCallback(async () => {
    setLoading(true);
    let query = db.from(def.table).select("*").order(def.orderBy ?? "created_at", { ascending: false }).limit(500);
    Object.entries(def.scope ?? {}).forEach(([k, v]) => { query = query.eq(k, v); });
    const { data, error } = await query;

    if (error) toast({ variant: "destructive", title: "Could not load records", description: error.message });
    setRows((data ?? []) as unknown as DbRow[]);
    setLoading(false);
  }, [def, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const loadLookups = async () => {
      if (needsProjects) {
        const { data } = await supabase.from("digital_practice_projects").select("id,name").order("name");
        setProjects((data ?? []).map((p) => ({ id: p.id, label: p.name })));
      }
      if (needsDoctors) {
        const { data } = await supabase.from("doctors").select("id, profiles:profile_id(full_name)").limit(500);
        setDoctors((data ?? []).map((d) => ({
          id: d.id,
          label: (d as unknown as { profiles?: { full_name?: string } }).profiles?.full_name || d.id.slice(0, 8),
        })));
      }
    };
    loadLookups();
  }, [needsProjects, needsDoctors]);

  const openCreate = () => { setEditing(null); setForm(emptyFor(def)); setOpen(true); };
  const openEdit = (row: DbRow) => {
    const next: Record<string, unknown> = {};
    def.fields.forEach((f) => {
      const v = row[f.key];
      next[f.key] = f.type === "tags" && Array.isArray(v) ? v.join(", ") : v ?? (f.type === "boolean" ? false : "");
    });
    setEditing(row); setForm(next); setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = { ...(def.scope ?? {}) };
    for (const f of def.fields) {
      const raw = form[f.key];
      if (f.type === "boolean") { payload[f.key] = Boolean(raw); continue; }
      if (raw === "" || raw === undefined || raw === null) {
        if (f.required) { toast({ variant: "destructive", title: `${f.label} is required` }); setSaving(false); return; }
        payload[f.key] = null; continue;
      }
      if (f.type === "number") payload[f.key] = Number(raw);
      else if (f.type === "tags") payload[f.key] = String(raw).split(",").map((s) => s.trim()).filter(Boolean);
      else payload[f.key] = raw;
    }

    const { error } = editing
      ? await supabase.from(def.table).update(payload).eq("id", editing.id)
      : await supabase.from(def.table).insert(payload);

    setSaving(false);
    if (error) { toast({ variant: "destructive", title: "Save failed", description: error.message }); return; }
    toast({ title: editing ? "Record updated" : "Record created" });
    setOpen(false);
    load();
  };

  const remove = async (row: DbRow) => {
    if (!window.confirm("Delete this record? This cannot be undone.")) return;
    const { error } = await supabase.from(def.table).delete().eq("id", row.id);
    if (error) { toast({ variant: "destructive", title: "Delete failed", description: error.message }); return; }
    toast({ title: "Record deleted" });
    load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [rows, search]);

  const renderField = (f: FieldDef) => {
    const value = form[f.key];
    if (f.type === "textarea") return <Textarea rows={4} value={String(value ?? "")} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />;
    if (f.type === "boolean") return <Switch checked={Boolean(value)} onCheckedChange={(v) => setForm({ ...form, [f.key]: v })} />;
    if (f.type === "select" || f.type === "project" || f.type === "doctor") {
      const options: Option[] = f.type === "project" ? projects
        : f.type === "doctor" ? doctors
        : (f.options ?? []).map((o) => ({ id: o, label: o }));
      return (
        <Select value={String(value ?? "")} onValueChange={(v) => setForm({ ...form, [f.key]: v })}>
          <SelectTrigger><SelectValue placeholder={`Select ${f.label.toLowerCase()}`} /></SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    return (
      <Input
        type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
        value={String(value ?? "")}
        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
      />
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="font-display">{def.title}</CardTitle>
            <CardDescription>{def.description}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input className="sm:w-56" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {!def.readOnly && (
              <Button onClick={openCreate} className="gradient-primary border-0 text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> New
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No records yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {listFields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    {listFields.map((f) => (
                      <TableCell key={f.key} className="max-w-[220px] truncate">{formatCell(row[f.key], f, { projects, doctors })}</TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(row)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit ${def.title}` : `New ${def.title}`}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {def.fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "space-y-2 sm:col-span-2" : "space-y-2"}>
                <Label>{f.label}{f.required ? " *" : ""}</Label>
                {renderField(f)}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gradient-primary border-0 text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourceManager;
