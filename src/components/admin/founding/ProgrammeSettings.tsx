import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { calcEarlyExit, useFoundingPricing } from "@/hooks/useFoundingPricing";

const money = (v: number, currency = "ZAR") =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 2 }).format(v || 0);

interface Props {
  program: any;
  foundingPlans: any[];
  onSaveProgram: (patch: any) => void;
}

const NumberField = ({ label, value, onCommit, hint }: { label: string; value: any; onCommit: (n: number) => void; hint?: string }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input
      type="number"
      defaultValue={value ?? 0}
      onBlur={(e) => {
        const n = Number(e.target.value);
        if (!Number.isNaN(n) && n !== Number(value)) onCommit(n);
      }}
    />
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const ProgrammeSettings = ({ program, foundingPlans, onSaveProgram }: Props) => {
  const { toast } = useToast();
  const { pricing, exitPolicy, refresh } = useFoundingPricing();
  const [exitMonths, setExitMonths] = useState(12);

  const savePricing = async (patch: any) => {
    if (!pricing) return;
    const { error } = await supabase.from("founding_programme_pricing" as any).update(patch).eq("id", pricing.id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Pricing updated" }); refresh(); }
  };

  const saveExit = async (patch: any) => {
    if (!exitPolicy) return;
    const { error } = await supabase.from("founding_exit_policy" as any).update(patch).eq("id", exitPolicy.id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Exit policy updated" }); refresh(); }
  };

  const currency = pricing?.currency || "ZAR";
  const policy = exitPolicy
    ? {
        commitment_months: exitPolicy.commitment_months,
        standard_practice_value: Number(exitPolicy.standard_practice_value),
        founding_contribution: Number(exitPolicy.founding_contribution),
      }
    : null;
  const live = policy ? calcEarlyExit(exitMonths, policy) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Programme Limits &amp; Availability</CardTitle>
          <CardDescription>Tiers are assigned automatically by joining sequence.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Pioneer limit" value={program?.pioneer_limit} onCommit={(n) => onSaveProgram({ pioneer_limit: n })} hint="Doctors 1 to this number become Pioneer Founding Doctors." />
            <NumberField label="Founding limit" value={program?.founding_limit} onCommit={(n) => onSaveProgram({ founding_limit: n })} hint="Doctors after the pioneer limit, up to this many." />
          </div>
          <div className="space-y-1.5">
            <Label>Programme label</Label>
            <Input defaultValue={program?.program_label} onBlur={(e) => e.target.value !== program?.program_label && onSaveProgram({ program_label: e.target.value })} />
          </div>
          {[
            { key: "programme_enabled", title: "Programme enabled", desc: "Turn the whole founding programme on or off." },
            { key: "applications_open", title: "Applications open", desc: "When off, new submissions go to the waiting list." },
            { key: "auto_close_pioneer", title: "Auto-close pioneer tier", desc: "Stop pioneer intake once the limit is reached." },
            { key: "auto_close_founding", title: "Auto-close founding tier", desc: "Stop founding intake once the limit is reached." },
            { key: "waiting_list_enabled", title: "Waiting list", desc: "Collect applications after all slots are filled." },
          ].map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <Switch checked={!!program?.[t.key]} onCheckedChange={(v) => onSaveProgram({ [t.key]: v })} />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label>Default founding pricing plan</Label>
            <Select value={program?.default_fee_settings_id || ""} onValueChange={(v) => onSaveProgram({ default_fee_settings_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent>
                {foundingPlans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.platform_fee_percent}%)</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Marketing Copy</CardTitle><CardDescription>Shown on the founding doctor recruitment pages.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "marketing_headline", label: "Headline", rows: 1 },
            { key: "marketing_description", label: "Description", rows: 3 },
            { key: "pioneer_copy", label: "Pioneer tier copy", rows: 3 },
            { key: "founding_copy", label: "Founding tier copy", rows: 3 },
          ].map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Textarea rows={f.rows} defaultValue={program?.[f.key] || ""} onBlur={(e) => e.target.value !== (program?.[f.key] || "") && onSaveProgram({ [f.key]: e.target.value })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Programme Pricing</CardTitle><CardDescription>Used across onboarding, agreements and reporting.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {pricing && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField label="Pioneer setup fee" value={pricing.pioneer_setup_fee} onCommit={(n) => savePricing({ pioneer_setup_fee: n })} />
                <NumberField label="Founding setup fee" value={pricing.founding_setup_fee} onCommit={(n) => savePricing({ founding_setup_fee: n })} />
                <NumberField label="Standard practice setup fee" value={pricing.standard_setup_fee} onCommit={(n) => savePricing({ standard_setup_fee: n })} />
                <NumberField label="Monthly care plan" value={pricing.monthly_care_plan} onCommit={(n) => savePricing({ monthly_care_plan: n })} />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <p className="font-semibold text-sm">Include VAT</p>
                  <p className="text-xs text-muted-foreground">Adds VAT to displayed programme fees.</p>
                </div>
                <Switch checked={pricing.vat_enabled} onCheckedChange={(v) => savePricing({ vat_enabled: v })} />
              </div>
              {pricing.vat_enabled && (
                <NumberField label="VAT rate (%)" value={pricing.vat_rate} onCommit={(n) => savePricing({ vat_rate: n })} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Early Exit Policy</CardTitle><CardDescription>Recovers the subsidised portion of the practice setup investment.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {exitPolicy && policy && live && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <NumberField label="Commitment period (months)" value={exitPolicy.commitment_months} onCommit={(n) => saveExit({ commitment_months: n })} />
                <NumberField label="Standard practice value" value={exitPolicy.standard_practice_value} onCommit={(n) => saveExit({ standard_practice_value: n })} />
                <NumberField label="Founding contribution" value={exitPolicy.founding_contribution} onCommit={(n) => saveExit({ founding_contribution: n })} />
              </div>
              <div className="space-y-1.5">
                <Label>Policy notes</Label>
                <Textarea rows={3} defaultValue={exitPolicy.policy_notes || ""} onBlur={(e) => e.target.value !== (exitPolicy.policy_notes || "") && saveExit({ policy_notes: e.target.value })} />
              </div>
              <div className="rounded-lg border p-4 space-y-3">
                <p className="font-semibold text-sm">Early exit calculator</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField label="Months completed" value={exitMonths} onCommit={setExitMonths} />
                  <div className="space-y-1 self-end">
                    <p className="text-xs text-muted-foreground">Subsidised amount: {money(live.subsidy, currency)}</p>
                    <p className="text-xs text-muted-foreground">Months remaining: {live.remainingMonths}</p>
                    <p className="text-lg font-bold">Owed on exit: {money(live.owed, currency)}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Months completed</TableHead><TableHead>Months remaining</TableHead><TableHead>Amount owed</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {[6, 12, 24, 36].map((m) => {
                        const r = calcEarlyExit(m, policy);
                        return (
                          <TableRow key={m}>
                            <TableCell>{m}</TableCell>
                            <TableCell>{r.remainingMonths}</TableCell>
                            <TableCell className="font-medium">{money(r.owed, currency)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgrammeSettings;
