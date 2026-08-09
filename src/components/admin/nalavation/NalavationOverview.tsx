import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Server, Search, Loader2, ReceiptText, Briefcase } from "lucide-react";

interface Stats {
  projects: number;
  live: number;
  websites: number;
  domains: number;
  hosting: number;
  seo: number;
  mrr: number;
  outstanding: number;
  paid: number;
}

const money = (v: number) => `R${v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const NalavationOverview = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [renewals, setRenewals] = useState<{ label: string; expires: string; kind: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const [projects, websites, domains, hosting, seo, invoices] = await Promise.all([
        supabase.from("digital_practice_projects").select("id,status,monthly_fee"),
        supabase.from("websites").select("id"),
        supabase.from("domain_registrations").select("domain_name,expires_on"),
        supabase.from("hosting_accounts").select("id,monthly_fee,status"),
        supabase.from("seo_projects").select("id,monthly_fee,status"),
        supabase.from("website_invoices").select("total_amount,status"),
      ]);

      const proj = projects.data ?? [];
      const mrr =
        proj.filter((p) => p.status === "live").reduce((s, p) => s + Number(p.monthly_fee ?? 0), 0) +
        (hosting.data ?? []).filter((h) => h.status === "active").reduce((s, h) => s + Number(h.monthly_fee ?? 0), 0) +
        (seo.data ?? []).filter((s2) => s2.status === "active").reduce((s, x) => s + Number(x.monthly_fee ?? 0), 0);

      const inv = invoices.data ?? [];
      setStats({
        projects: proj.length,
        live: proj.filter((p) => p.status === "live").length,
        websites: (websites.data ?? []).length,
        domains: (domains.data ?? []).length,
        hosting: (hosting.data ?? []).length,
        seo: (seo.data ?? []).length,
        mrr,
        outstanding: inv.filter((i) => ["sent", "overdue"].includes(String(i.status))).reduce((s, i) => s + Number(i.total_amount ?? 0), 0),
        paid: inv.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total_amount ?? 0), 0),
      });

      const soon = (domains.data ?? [])
        .filter((d) => d.expires_on)
        .map((d) => ({ label: d.domain_name as string, expires: d.expires_on as string, kind: "Domain" }))
        .sort((a, b) => a.expires.localeCompare(b.expires))
        .slice(0, 8);
      setRenewals(soon);
    };
    load();
  }, []);

  if (!stats) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const cards = [
    { label: "Digital practices", value: `${stats.projects}`, sub: `${stats.live} live`, icon: Briefcase },
    { label: "Websites", value: `${stats.websites}`, sub: "built & managed", icon: Globe },
    { label: "Hosting & domains", value: `${stats.hosting + stats.domains}`, sub: `${stats.hosting} hosting · ${stats.domains} domains`, icon: Server },
    { label: "SEO retainers", value: `${stats.seo}`, sub: "active projects", icon: Search },
    { label: "Recurring revenue", value: money(stats.mrr), sub: "per month", icon: ReceiptText },
    { label: "Outstanding invoices", value: money(stats.outstanding), sub: `${money(stats.paid)} collected`, icon: ReceiptText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Nalavation</h2>
        <p className="text-sm text-muted-foreground">
          Digital practice services — websites, hosting, domains, SEO and online presence for doctors on the platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Upcoming domain renewals</CardTitle>
          <CardDescription>Next expiry dates across all managed domains.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {renewals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No domains registered yet.</p>
          ) : (
            renewals.map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="truncate text-sm">{r.label}</span>
                <Badge variant="secondary">{r.kind} · {new Date(r.expires).toLocaleDateString()}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NalavationOverview;
