import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, RefreshCw, Mail } from "lucide-react";

type LogRow = {
  id: string;
  appointment_id: string;
  email_type: string;
  recipient: string;
  resend_id: string | null;
  status: string;
  error: string | null;
  created_at: string;
};

const AdminEmailTest = () => {
  const { toast } = useToast();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("Test email from Doctors Onlining");
  const [message, setMessage] = useState("This is a test email sent from the admin panel via assist@doctorsonlining.com.");
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadLogs = async () => {
    setLoadingLogs(true);
    const { data, error } = await supabase
      .from("booking_email_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast({ title: "Failed to load logs", description: error.message, variant: "destructive" });
    } else {
      setLogs((data || []) as LogRow[]);
    }
    setLoadingLogs(false);
  };

  useEffect(() => { loadLogs(); }, []);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !message.trim()) {
      toast({ title: "Missing fields", description: "Recipient, subject and message are required.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-test-email", {
        body: { to: to.trim(), subject: subject.trim(), message: message.trim() },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Send failed", description: JSON.stringify(data.error), variant: "destructive" });
      } else {
        toast({ title: "Email sent", description: `Resend ID: ${data?.id || "n/a"}` });
      }
      await loadLogs();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || String(e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (s: string) => {
    if (s === "sent") return <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/20">sent</Badge>;
    if (s === "failed") return <Badge variant="destructive">failed</Badge>;
    return <Badge variant="secondary">{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Send Test Email</CardTitle>
          <CardDescription>From: <code className="text-xs">assist@doctorsonlining.com</code></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">Recipient email</Label>
            <Input id="to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Test Email
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Email Delivery Log</CardTitle>
            <CardDescription>Last 100 booking & test email events</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loadingLogs}>
            {loadingLogs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resend ID</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && !loadingLogs && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No emails logged yet.</TableCell></TableRow>
                )}
                {logs.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(row.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs"><code>{row.email_type}</code></TableCell>
                    <TableCell className="text-xs">{row.recipient}</TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{row.resend_id || "-"}</TableCell>
                    <TableCell className="text-xs text-destructive max-w-xs truncate" title={row.error || ""}>{row.error || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmailTest;
