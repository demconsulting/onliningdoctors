import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Save, Building2, User, Landmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User as SupaUser } from "@supabase/supabase-js";

interface DoctorBillingProps {
  user: SupaUser;
}

const ACCOUNT_TYPES = ["Cheque/Current", "Savings", "Transmission"];

const DoctorBilling = ({ user }: DoctorBillingProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const { toast } = useToast();

  const [billing, setBilling] = useState({
    billing_type: "individual",
    bank_name: "",
    account_holder_name: "",
    account_number: "",
    branch_code: "",
    bank_swift_code: "",
    account_type: "",
    company_name: "",
    company_registration_number: "",
    company_vat_number: "",
    company_address: "",
    company_phone: "",
    company_email: "",
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("doctor_billing" as any)
        .select("*")
        .eq("doctor_id", user.id)
        .single();

      if (data) {
        const d = data as any;
        setIsNew(false);
        setBilling({
          billing_type: d.billing_type || "individual",
          bank_name: d.bank_name || "",
          account_holder_name: d.account_holder_name || "",
          account_number: d.account_number || "",
          branch_code: d.branch_code || "",
          bank_swift_code: d.bank_swift_code || "",
          account_type: d.account_type || "",
          company_name: d.company_name || "",
          company_registration_number: d.company_registration_number || "",
          company_vat_number: d.company_vat_number || "",
          company_address: d.company_address || "",
          company_phone: d.company_phone || "",
          company_email: d.company_email || "",
        });
      }
      setLoading(false);
    };
    load();
  }, [user.id]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      doctor_id: user.id,
      ...billing,
      // Clear company fields if individual
      ...(billing.billing_type === "individual" && {
        company_name: null,
        company_registration_number: null,
        company_vat_number: null,
        company_address: null,
        company_phone: null,
        company_email: null,
      }),
    };

    let error;
    if (isNew) {
      const res = await supabase.from("doctor_billing" as any).insert(payload as any);
      error = res.error;
      if (!error) setIsNew(false);
    } else {
      const res = await supabase.from("doctor_billing" as any).update(payload as any).eq("doctor_id", user.id);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Error saving billing details", description: error.message });
    } else {
      toast({ title: "Billing details saved successfully" });
    }
  };

  const update = (field: string, value: string) => setBilling((prev) => ({ ...prev, [field]: value }));

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Landmark className="h-5 w-5 text-primary" /> Billing & Banking Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Billing Type Toggle */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Practice Type</Label>
            <RadioGroup
              value={billing.billing_type}
              onValueChange={(v) => update("billing_type", v)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors flex-1"
                onClick={() => update("billing_type", "individual")}>
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4 text-primary" /> Individual
                </Label>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors flex-1"
                onClick={() => update("billing_type", "company")}>
                <RadioGroupItem value="company" id="company" />
                <Label htmlFor="company" className="flex items-center gap-2 cursor-pointer">
                  <Building2 className="h-4 w-4 text-primary" /> Company / Practice
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Company Details */}
          {billing.billing_type === "company" && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Company Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input value={billing.company_name} onChange={(e) => update("company_name", e.target.value)} placeholder="e.g. MedCare Practice (Pty) Ltd" />
                </div>
                <div className="space-y-2">
                  <Label>Registration Number</Label>
                  <Input value={billing.company_registration_number} onChange={(e) => update("company_registration_number", e.target.value)} placeholder="e.g. 2024/123456/07" />
                </div>
                <div className="space-y-2">
                  <Label>VAT Number (optional)</Label>
                  <Input value={billing.company_vat_number} onChange={(e) => update("company_vat_number", e.target.value)} placeholder="e.g. 4123456789" />
                </div>
                <div className="space-y-2">
                  <Label>Company Email</Label>
                  <Input type="email" value={billing.company_email} onChange={(e) => update("company_email", e.target.value)} placeholder="e.g. billing@medcare.co.za" />
                </div>
                <div className="space-y-2">
                  <Label>Company Phone</Label>
                  <Input value={billing.company_phone} onChange={(e) => update("company_phone", e.target.value)} placeholder="e.g. +27 11 234 5678" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Company Address</Label>
                  <Input value={billing.company_address} onChange={(e) => update("company_address", e.target.value)} placeholder="e.g. 123 Main Road, Sandton, 2196" />
                </div>
              </div>
            </div>
          )}

          {/* Bank Details */}
          <div className="space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" /> Bank Account Details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={billing.bank_name} onChange={(e) => update("bank_name", e.target.value)} placeholder="e.g. FNB, Standard Bank, Nedbank" />
              </div>
              <div className="space-y-2">
                <Label>Account Holder Name</Label>
                <Input value={billing.account_holder_name} onChange={(e) => update("account_holder_name", e.target.value)} placeholder="Name as it appears on the account" />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input value={billing.account_number} onChange={(e) => update("account_number", e.target.value)} placeholder="Your bank account number" />
              </div>
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select value={billing.account_type} onValueChange={(v) => update("account_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select account type" /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch Code</Label>
                <Input value={billing.branch_code} onChange={(e) => update("branch_code", e.target.value)} placeholder="e.g. 250655" />
              </div>
              <div className="space-y-2">
                <Label>SWIFT Code (optional)</Label>
                <Input value={billing.bank_swift_code} onChange={(e) => update("bank_swift_code", e.target.value)} placeholder="e.g. FIRNZAJJ" />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary border-0 text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Billing Details
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorBilling;
