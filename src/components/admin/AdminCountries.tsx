import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Globe, Loader2 } from "lucide-react";

interface Country {
  code: string;
  name: string;
  currency_code: string;
  currency_symbol: string;
  is_active: boolean;
}

const emptyForm = { code: "", name: "", currency_code: "", currency_symbol: "", is_active: true };

const AdminCountries = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCountries = async () => {
    const { data, error } = await supabase
      .from("countries")
      .select("*")
      .order("name");
    if (error) { toast.error(error.message); return; }
    setCountries(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCountries(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Country) => {
    setEditing(c.code);
    setForm({ code: c.code, name: c.name, currency_code: c.currency_code, currency_symbol: c.currency_symbol, is_active: c.is_active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !form.currency_code || !form.currency_symbol) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("countries")
        .update({ name: form.name, currency_code: form.currency_code.toUpperCase(), currency_symbol: form.currency_symbol, is_active: form.is_active })
        .eq("code", editing);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Country updated");
    } else {
      const { error } = await supabase
        .from("countries")
        .insert({ code: form.code.toUpperCase(), name: form.name, currency_code: form.currency_code.toUpperCase(), currency_symbol: form.currency_symbol, is_active: form.is_active });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Country added");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchCountries();
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Delete country ${code}? This will also remove its legal documents.`)) return;
    const { error } = await supabase.from("countries").delete().eq("code", code);
    if (error) { toast.error(error.message); return; }
    toast.success("Country deleted");
    fetchCountries();
  };

  const toggleActive = async (code: string, current: boolean) => {
    const { error } = await supabase.from("countries").update({ is_active: !current }).eq("code", code);
    if (error) { toast.error(error.message); return; }
    fetchCountries();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Countries & Currencies</h2>
          <p className="text-sm text-muted-foreground">Manage supported countries, their currencies, and activation status</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Country</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Country" : "Add Country"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Country Code (e.g. ZA)</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    maxLength={2}
                    disabled={!!editing}
                    placeholder="ZA"
                  />
                </div>
                <div>
                  <Label>Country Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="South Africa" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Currency Code (e.g. ZAR)</Label>
                  <Input value={form.currency_code} onChange={(e) => setForm({ ...form, currency_code: e.target.value })} maxLength={4} placeholder="ZAR" />
                </div>
                <div>
                  <Label>Currency Symbol (e.g. R)</Label>
                  <Input value={form.currency_symbol} onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })} maxLength={5} placeholder="R" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editing ? "Update" : "Add"} Country
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countries.map((c) => (
                <TableRow key={c.code}>
                  <TableCell className="font-mono font-medium">{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell className="font-mono">{c.currency_code}</TableCell>
                  <TableCell>{c.currency_symbol}</TableCell>
                  <TableCell>
                    <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.code, c.is_active)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.code)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCountries;
