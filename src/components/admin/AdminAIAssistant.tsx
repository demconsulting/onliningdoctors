import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Loader2, Bot, Plus, Trash2, Save, MessageSquare, AlertTriangle,
  BookOpen, Eye, CheckCircle2, Clock, Pencil, Ticket, Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* ------------------------------------------------------------------ */
/*  FAQ Articles Tab                                                    */
/* ------------------------------------------------------------------ */
const FaqArticlesTab = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", content: "", category: "general", is_published: true,
    question: "", answer: "", keywords: "",
  });
  const { toast } = useToast();
  const categories = ["general", "booking", "payment", "consultation", "cancellation", "technical", "privacy", "emergency", "doctors"];

  const fetchArticles = async () => {
    const { data } = await supabase.from("faq_articles" as any).select("*").order("sort_order");
    if (data) setArticles(data as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, []);

  const resetForm = () => {
    setEditId(null);
    setForm({ title: "", content: "", category: "general", is_published: true, question: "", answer: "", keywords: "" });
  };

  const saveArticle = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const payload = {
      title: form.title,
      content: form.content,
      category: form.category,
      is_published: form.is_published,
      question: form.question || null,
      answer: form.answer || null,
      keywords: form.keywords ? form.keywords.split(",").map((k: string) => k.trim()).filter(Boolean) : [],
      slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    };
    if (editId) {
      await supabase.from("faq_articles" as any).update(payload as any).eq("id", editId);
      toast({ title: "Article updated" });
    } else {
      await supabase.from("faq_articles" as any).insert({ ...payload, sort_order: articles.length } as any);
      toast({ title: "Article added" });
    }
    resetForm();
    fetchArticles();
  };

  const deleteArticle = async (id: string) => {
    await supabase.from("faq_articles" as any).delete().eq("id", id);
    toast({ title: "Article deleted" });
    fetchArticles();
  };

  const startEdit = (a: any) => {
    setEditId(a.id);
    setForm({
      title: a.title, content: a.content, category: a.category,
      is_published: a.is_published, question: a.question || "",
      answer: a.answer || "",
      keywords: a.keywords ? a.keywords.join(", ") : "",
    });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">{editId ? "Edit Article" : "Add New Article"}</p>
        <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Article title" />
        <Textarea value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Article content (AI knowledge base)" rows={3} />
        <Input value={form.question} onChange={(e) => setForm(f => ({ ...f, question: e.target.value }))} placeholder="FAQ Question (optional)" />
        <Textarea value={form.answer} onChange={(e) => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="FAQ Answer (optional)" rows={2} />
        <Input value={form.keywords} onChange={(e) => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="Keywords (comma-separated, e.g. booking, appointment, schedule)" />
        <div className="flex items-center gap-3 flex-wrap">
          <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={form.is_published} onCheckedChange={(v) => setForm(f => ({ ...f, is_published: v }))} /> Published
          </label>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveArticle} size="sm" className="gap-1">
            {editId ? <Save className="h-3 w-3" /> : <Plus className="h-3 w-3" />} {editId ? "Update" : "Add"}
          </Button>
          {editId && <Button onClick={resetForm} size="sm" variant="outline">Cancel</Button>}
        </div>
      </div>

      <div className="space-y-2">
        {articles.map((a: any) => (
          <div key={a.id} className="flex items-start justify-between rounded-lg border border-border p-3 gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <Badge variant={a.is_published ? "default" : "secondary"} className="text-[10px]">{a.is_published ? "Published" : "Draft"}</Badge>
                <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
              {a.keywords && a.keywords.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {a.keywords.map((kw: string, i: number) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground">{kw}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteArticle(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
        {articles.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No FAQ articles yet.</p>}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Conversations Tab                                                   */
/* ------------------------------------------------------------------ */
const ConversationsTab = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("ai_conversations" as any).select("*").order("created_at", { ascending: false }).limit(50);
      if (data) setConversations(data as any[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const viewMessages = async (conv: any) => {
    setSelectedConv(conv);
    setMessagesLoading(true);
    const { data } = await supabase.from("ai_messages" as any).select("*").eq("conversation_id", conv.id).order("created_at");
    if (data) setMessages(data as any[]);
    setMessagesLoading(false);
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <>
      <div className="space-y-2">
        {conversations.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => viewMessages(c)}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">{c.session_id?.slice(0, 8)}...</p>
                <Badge variant={c.status === "active" ? "default" : c.status === "escalated" ? "destructive" : "secondary"} className="text-[10px]">{c.status}</Badge>
                {c.channel && <Badge variant="outline" className="text-[10px]">{c.channel}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()} • User: {c.user_id ? c.user_id.slice(0, 8) + "..." : "Anonymous"}</p>
            </div>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}
        {conversations.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No conversations yet.</p>}
      </div>

      <Dialog open={!!selectedConv} onOpenChange={() => setSelectedConv(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-sm font-display">Conversation {selectedConv?.session_id?.slice(0, 8)}...</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {messagesLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-3 p-1">
                {messages.map((m: any) => (
                  <div key={m.id} className={`rounded-lg p-3 text-sm ${m.role === "user" ? "bg-primary/10 ml-8" : m.role === "assistant" ? "bg-muted mr-8" : "bg-accent/10 text-xs"}`}>
                    <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase">{m.role}</p>
                    <p className="whitespace-pre-wrap text-foreground">{m.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleTimeString()}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Handoffs Tab                                                        */
/* ------------------------------------------------------------------ */
const HandoffsTab = () => {
  const [handoffs, setHandoffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHandoffs = async () => {
    const { data } = await supabase.from("ai_handoffs" as any).select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setHandoffs(data as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchHandoffs(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("ai_handoffs" as any).update({
      status,
      ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
    } as any).eq("id", id);
    toast({ title: `Handoff ${status}` });
    fetchHandoffs();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-2">
      {handoffs.map((h: any) => (
        <div key={h.id} className="flex items-start justify-between rounded-lg border border-border p-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <Badge variant={h.status === "pending" ? "destructive" : h.status === "in_progress" ? "default" : "secondary"} className="text-[10px]">{h.status}</Badge>
            </div>
            <p className="text-sm text-foreground">{h.reason}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(h.created_at).toLocaleString()}
              {h.resolved_at && ` • Resolved: ${new Date(h.resolved_at).toLocaleString()}`}
            </p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {h.status === "pending" && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => updateStatus(h.id, "in_progress")}>
                <Clock className="h-3 w-3" /> In Progress
              </Button>
            )}
            {(h.status === "pending" || h.status === "in_progress") && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => updateStatus(h.id, "resolved")}>
                <CheckCircle2 className="h-3 w-3" /> Resolve
              </Button>
            )}
          </div>
        </div>
      ))}
      {handoffs.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No escalations yet.</p>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Support Tickets Tab                                                 */
/* ------------------------------------------------------------------ */
const SupportTicketsTab = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTickets = async () => {
    const { data } = await supabase.from("support_tickets" as any).select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setTickets(data as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("support_tickets" as any).update({ status } as any).eq("id", id);
    toast({ title: `Ticket ${status}` });
    fetchTickets();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-2">
      {tickets.map((t: any) => (
        <div key={t.id} className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground">{t.subject || "No subject"}</p>
                <Badge variant={t.status === "open" ? "destructive" : t.status === "in_progress" ? "default" : "secondary"} className="text-[10px]">{t.status}</Badge>
                <Badge variant="outline" className="text-[10px]">{t.source}</Badge>
              </div>
              <p className="text-xs text-foreground">{t.name} • {t.email}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.message}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {t.status === "open" && (
                <Button variant="outline" size="sm" className="text-xs" onClick={() => updateStatus(t.id, "in_progress")}>In Progress</Button>
              )}
              {t.status !== "closed" && (
                <Button variant="outline" size="sm" className="text-xs" onClick={() => updateStatus(t.id, "closed")}>Close</Button>
              )}
            </div>
          </div>
        </div>
      ))}
      {tickets.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No support tickets yet.</p>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Settings Tab                                                        */
/* ------------------------------------------------------------------ */
const SettingsTab = () => {
  const [welcomeMessage, setWelcomeMessage] = useState(
    "👋 Hello! I'm the Doctor Onlining assistant. I can help with bookings, payments, doctor specialties, appointment status, and technical support.\n\nHow can I assist you today?"
  );
  const [emergencyDisclaimer, setEmergencyDisclaimer] = useState(
    "⚠️ This may be a medical emergency. Please seek immediate emergency medical assistance or go to the nearest emergency facility now. Call your local emergency number (911/112/999) immediately."
  );
  const [emergencyKeywords, setEmergencyKeywords] = useState(
    "chest pain, trouble breathing, severe bleeding, unconsciousness, seizure, stroke, suicidal, self-harm, overdose, emergency"
  );
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "ai_assistant_settings").single();
      if (data?.value) {
        const val = data.value as any;
        if (val.welcome_message) setWelcomeMessage(val.welcome_message);
        if (typeof val.enabled === "boolean") setEnabled(val.enabled);
        if (val.emergency_disclaimer) setEmergencyDisclaimer(val.emergency_disclaimer);
        if (val.emergency_keywords) setEmergencyKeywords(val.emergency_keywords);
      }
    };
    fetch();
  }, []);

  const save = async () => {
    setSaving(true);
    const value = { welcome_message: welcomeMessage, enabled, emergency_disclaimer: emergencyDisclaimer, emergency_keywords: emergencyKeywords };
    const { data: existing } = await supabase.from("site_content").select("id").eq("key", "ai_assistant_settings").single();
    if (existing) {
      await supabase.from("site_content").update({ value: value as any }).eq("key", "ai_assistant_settings");
    } else {
      await supabase.from("site_content").insert({ key: "ai_assistant_settings", value: value as any });
    }
    setSaving(false);
    toast({ title: "Settings saved" });
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Switch checked={enabled} onCheckedChange={setEnabled} /> Enable AI Assistant
      </label>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Welcome Message</p>
        <Textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Emergency Disclaimer</p>
        <Textarea value={emergencyDisclaimer} onChange={(e) => setEmergencyDisclaimer(e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Emergency Keywords (comma-separated)</p>
        <Textarea value={emergencyKeywords} onChange={(e) => setEmergencyKeywords(e.target.value)} rows={2} />
        <p className="text-[10px] text-muted-foreground">These keywords trigger the emergency response in the AI system prompt.</p>
      </div>
      <Button onClick={save} disabled={saving} size="sm" className="gap-1">
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save Settings
      </Button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Admin AI Assistant                                             */
/* ------------------------------------------------------------------ */
const AdminAIAssistant = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Bot className="h-5 w-5 text-primary" /> AI Assistant Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="faq" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="faq" className="gap-1 text-xs">
              <BookOpen className="h-3 w-3" /> FAQ
            </TabsTrigger>
            <TabsTrigger value="conversations" className="gap-1 text-xs">
              <MessageSquare className="h-3 w-3" /> Chats
            </TabsTrigger>
            <TabsTrigger value="handoffs" className="gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" /> Escalations
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-1 text-xs">
              <Ticket className="h-3 w-3" /> Tickets
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1 text-xs">
              <Settings className="h-3 w-3" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faq"><FaqArticlesTab /></TabsContent>
          <TabsContent value="conversations"><ConversationsTab /></TabsContent>
          <TabsContent value="handoffs"><HandoffsTab /></TabsContent>
          <TabsContent value="tickets"><SupportTicketsTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminAIAssistant;
