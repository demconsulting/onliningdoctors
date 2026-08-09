import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const money = (v: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(v || 0);

const CONTACTED = ["contacted", "interested", "meeting_scheduled", "demo_completed", "proposal_sent", "invited", "registered", "pending_verification", "verified", "founding_doctor", "activated", "first_consultation_completed"];
const MEETINGS = ["meeting_scheduled", "demo_completed", "proposal_sent", "invited", "registered", "pending_verification", "verified", "founding_doctor", "activated", "first_consultation_completed"];
const APPLIED = ["registered", "pending_verification", "verified", "founding_doctor", "activated", "first_consultation_completed"];
const APPROVED = ["verified", "founding_doctor", "activated", "first_consultation_completed"];

const BusinessDeveloperDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [prospects, setProspects] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [people, setPeople] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [p, c] = await Promise.all([
      supabase.from("recruitment_prospects" as any).select("id, stage, business_developer, assigned_recruiter, linked_doctor_profile_id"),
      supabase.from("recruitment_commissions" as any).select("*"),
    ]);
    const rows = (p.data as any[]) || [];
    const comms = (c.data as any[]) || [];
    setProspects(rows);
    setCommissions(comms);

    const ids = new Set<string>();
    rows.forEach((r) => r.business_developer && ids.add(r.business_developer));
    comms.forEach((r) => r.business_developer && ids.add(r.business_developer));
    if (ids.size) {
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", Array.from(ids));
      const map: Record<string, string> = {};
      (data || []).forEach((x: any) => { map[x.id] = x.full_name; });
      setPeople(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const keys = new Set<string>();
    prospects.forEach((p) => keys.add(p.business_developer || "unassigned"));
    commissions.forEach((c) => keys.add(c.business_developer || "unassigned"));

    return Array.from(keys).map((key) => {
      const mine = prospects.filter((p) => (p.business_developer || "unassigned") === key);
      const myComms = commissions.filter((c) => (c.business_developer || "unassigned") === key);
      const leads = mine.length;
      const approved = mine.filter((p) => APPROVED.includes(p.stage)).length;
      const sum = (status?: string) =>
        myComms.filter((c) => (status ? c.status === status : true)).reduce((a, c) => a + Number(c.amount || 0), 0);
      return {
        key,
        name: key === "unassigned" ? "Unassigned" : people[key] || key,
        leads,
        contacted: mine.filter((p) => CONTACTED.includes(p.stage)).length,
        meetings: mine.filter((p) => MEETINGS.includes(p.stage)).length,
        applications: mine.filter((p) => APPLIED.includes(p.stage)).length,
        approved,
        conversion: leads ? Math.round((approved / leads) * 100) : 0,
        earned: sum(),
        pending: sum("pending"),
        paid: sum("paid"),
      };
    }).sort((a, b) => b.approved - a.approved || b.leads - a.leads);
  }, [prospects, commissions, people]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Developer Performance</CardTitle>
        <CardDescription>Recruitment activity and commission earnings per business developer.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No prospect activity yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business developer</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Contacted</TableHead>
                <TableHead>Meetings</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Conversion</TableHead>
                <TableHead>Earned</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.leads}</TableCell>
                  <TableCell>{r.contacted}</TableCell>
                  <TableCell>{r.meetings}</TableCell>
                  <TableCell>{r.applications}</TableCell>
                  <TableCell>{r.approved}</TableCell>
                  <TableCell><Badge variant="outline">{r.conversion}%</Badge></TableCell>
                  <TableCell>{money(r.earned)}</TableCell>
                  <TableCell>{money(r.pending)}</TableCell>
                  <TableCell>{money(r.paid)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default BusinessDeveloperDashboard;
