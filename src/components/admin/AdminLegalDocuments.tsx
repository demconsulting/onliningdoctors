import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2, FileText, Globe, GripVertical } from "lucide-react";

interface LegalSection {
  title: string;
  content: string;
}

interface LegalDoc {
  id: string;
  document_type: string;
  country_code: string | null;
  heading: string;
  last_updated: string;
  sections: LegalSection[];
  is_default: boolean;
}

interface Country {
  code: string;
  name: string;
}

const AdminLegalDocuments = () => {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("terms");
  const [editDoc, setEditDoc] = useState<LegalDoc | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addCountry, setAddCountry] = useState("");

  const fetchData = async () => {
    const [docsRes, countriesRes] = await Promise.all([
      supabase.from("legal_documents").select("*").order("is_default", { ascending: false }),
      supabase.from("countries").select("code, name").eq("is_active", true).order("name"),
    ]);
    if (docsRes.error) toast.error(docsRes.error.message);
    if (countriesRes.error) toast.error(countriesRes.error.message);
    
    const parsedDocs = (docsRes.data || []).map(d => ({
      ...d,
      sections: (Array.isArray(d.sections) ? d.sections : []) as unknown as LegalSection[],
    }));
    
    setDocs(parsedDocs);
    setCountries(countriesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getDefaultDoc = (type: string) => docs.find(d => d.document_type === type && d.is_default);
  const getOverrides = (type: string) => docs.filter(d => d.document_type === type && !d.is_default);

  const countriesWithOverride = (type: string) => {
    const overrides = getOverrides(type);
    return overrides.map(o => o.country_code).filter(Boolean);
  };

  const availableCountriesForOverride = (type: string) => {
    const used = countriesWithOverride(type);
    return countries.filter(c => !used.includes(c.code));
  };

  const handleSaveDoc = async (doc: LegalDoc) => {
    setSaving(true);
    const { error } = await supabase
      .from("legal_documents")
      .update({
        heading: doc.heading,
        last_updated: doc.last_updated,
        sections: doc.sections as any,
      })
      .eq("id", doc.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Document saved");
    setSaving(false);
    fetchData();
  };

  const headingForType = (type: string) => {
    if (type === "terms") return "Terms of Service";
    if (type === "privacy") return "Privacy Policy";
    return "Refund Policy";
  };

  const handleCreateDefault = async (type: string) => {
    const heading = headingForType(type);
    const { error } = await supabase.from("legal_documents").insert({
      document_type: type,
      heading,
      last_updated: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      sections: [],
      is_default: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Default document created");
    fetchData();
  };

  const handleAddOverride = async (type: string) => {
    if (!addCountry) { toast.error("Select a country"); return; }
    const country = countries.find(c => c.code === addCountry);
    const heading = `${headingForType(type)} — ${country?.name || addCountry}`;
    
    const { error } = await supabase.from("legal_documents").insert({
      document_type: type,
      country_code: addCountry,
      heading,
      last_updated: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      sections: [],
      is_default: false,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Override added for ${country?.name}`);
    setAddDialogOpen(false);
    setAddCountry("");
    fetchData();
  };

  const handleDeleteOverride = async (id: string) => {
    if (!confirm("Delete this country override?")) return;
    const { error } = await supabase.from("legal_documents").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Override deleted");
    fetchData();
  };

  const updateSection = (doc: LegalDoc, idx: number, field: "title" | "content", value: string) => {
    const updated = { ...doc, sections: [...doc.sections] };
    updated.sections[idx] = { ...updated.sections[idx], [field]: value };
    setEditDoc(updated);
    // Update in docs list too
    setDocs(prev => prev.map(d => d.id === doc.id ? updated : d));
  };

  const addSection = (doc: LegalDoc) => {
    const updated = { ...doc, sections: [...doc.sections, { title: "", content: "" }] };
    setDocs(prev => prev.map(d => d.id === doc.id ? updated : d));
  };

  const removeSection = (doc: LegalDoc, idx: number) => {
    const updated = { ...doc, sections: doc.sections.filter((_, i) => i !== idx) };
    setDocs(prev => prev.map(d => d.id === doc.id ? updated : d));
  };

  const renderDocEditor = (doc: LegalDoc) => (
    <Card key={doc.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {doc.is_default ? <FileText className="h-5 w-5 text-primary" /> : <Globe className="h-5 w-5 text-muted-foreground" />}
            <CardTitle className="text-lg">
              {doc.is_default ? "Global Default" : countries.find(c => c.code === doc.country_code)?.name || doc.country_code}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleSaveDoc(doc)} disabled={saving}>
              <Save className="mr-1 h-4 w-4" /> Save
            </Button>
            {!doc.is_default && (
              <Button size="sm" variant="destructive" onClick={() => handleDeleteOverride(doc.id)}>
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Heading</Label>
            <Input
              value={doc.heading}
              onChange={(e) => setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, heading: e.target.value } : d))}
            />
          </div>
          <div>
            <Label>Last Updated</Label>
            <Input
              value={doc.last_updated}
              onChange={(e) => setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, last_updated: e.target.value } : d))}
              placeholder="March 2026"
            />
          </div>
        </div>

        {!doc.is_default && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            Override sections are <strong>appended</strong> to the global default. Only add country-specific sections here (e.g. local compliance, governing law).
          </p>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{doc.is_default ? "Base Sections" : "Override Sections"}</Label>
            <Button size="sm" variant="outline" onClick={() => addSection(doc)}>
              <Plus className="mr-1 h-3 w-3" /> Add Section
            </Button>
          </div>
          
          {doc.sections.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              No sections yet. Click "Add Section" to start.
            </p>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {doc.sections.map((section, idx) => (
                <AccordionItem key={idx} value={`section-${idx}`} className="border rounded-lg px-3">
                  <AccordionTrigger className="py-2 text-sm hover:no-underline">
                    <span className="text-left">{section.title || `Section ${idx + 1} (untitled)`}</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-3">
                    <div>
                      <Label className="text-xs">Section Title</Label>
                      <Input
                        value={section.title}
                        onChange={(e) => updateSection(doc, idx, "title", e.target.value)}
                        placeholder="e.g. 18. POPIA Compliance (South Africa)"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Content</Label>
                      <Textarea
                        value={section.content}
                        onChange={(e) => updateSection(doc, idx, "content", e.target.value)}
                        rows={6}
                        placeholder="Section content..."
                      />
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeSection(doc, idx)}>
                      <Trash2 className="mr-1 h-3 w-3" /> Remove Section
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderTab = (type: string) => {
    const defaultDoc = getDefaultDoc(type);
    const overrides = getOverrides(type);
    const available = availableCountriesForOverride(type);

    return (
      <div className="space-y-6">
        {/* Global Default */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Global Default</h3>
          {defaultDoc ? (
            renderDocEditor(defaultDoc)
          ) : (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-3">No global default document yet.</p>
              <Button onClick={() => handleCreateDefault(type)}>
                <Plus className="mr-2 h-4 w-4" /> Create Default {type === "terms" ? "Terms" : "Privacy Policy"}
              </Button>
            </Card>
          )}
        </div>

        {/* Country Overrides */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground">Country-Specific Overrides</h3>
            {available.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Add Override
              </Button>
            )}
          </div>
          {overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No country overrides yet.</p>
          ) : (
            overrides.map(renderDocEditor)
          )}
        </div>

        {/* Add override dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Country Override</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Country</Label>
                <Select value={addCountry} onValueChange={setAddCountry}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {available.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => handleAddOverride(type)} className="w-full">
                Create Override
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Legal Documents</h2>
        <p className="text-sm text-muted-foreground">
          Manage global Terms & Privacy and add country-specific override sections
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="terms">Terms of Service</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
          <TabsTrigger value="refund">Refund Policy</TabsTrigger>
        </TabsList>
        <TabsContent value="terms" className="mt-4">{renderTab("terms")}</TabsContent>
        <TabsContent value="privacy" className="mt-4">{renderTab("privacy")}</TabsContent>
        <TabsContent value="refund" className="mt-4">{renderTab("refund")}</TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLegalDocuments;
