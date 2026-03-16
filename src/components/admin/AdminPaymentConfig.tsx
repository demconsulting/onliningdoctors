import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CreditCard, Shield, Banknote, Settings2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CURRENCIES = [
  { code: "NGN", name: "Nigerian Naira" },
  { code: "USD", name: "US Dollar" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "ZAR", name: "South African Rand" },
];

const PAYMENT_METHODS = [
  { key: "card", label: "Card (Visa, Mastercard)" },
  { key: "bank_transfer", label: "Bank Transfer" },
  { key: "ussd", label: "USSD" },
  { key: "mobile_money", label: "Mobile Money" },
  { key: "qr", label: "QR Code" },
];

const FEE_BEARERS = [
  { value: "patient", label: "Patient pays fees" },
  { value: "doctor", label: "Doctor pays fees" },
  { value: "platform", label: "Platform absorbs fees" },
];

const PAYMENT_TIMINGS = [
  { value: "at_booking", label: "Pay at Booking", desc: "Patients pay when they book" },
  { value: "before_call", label: "Pay Before Call", desc: "Payment required before joining consultation" },
  { value: "after_completion", label: "Pay After Completion", desc: "Payment processed after consultation ends" },
];

interface PaystackConfig {
  mode: "test" | "live";
  public_key_test: string;
  public_key_live: string;
  supported_currencies: string[];
  payment_methods: string[];
  fee_bearer: string;
  payment_timing: string;
  payouts_enabled: boolean;
  platform_commission_percent: number;
}

const DEFAULT_CONFIG: PaystackConfig = {
  mode: "test",
  public_key_test: "",
  public_key_live: "",
  supported_currencies: ["NGN"],
  payment_methods: ["card"],
  fee_bearer: "patient",
  payment_timing: "at_booking",
  payouts_enabled: false,
  platform_commission_percent: 15,
};

const AdminPaymentConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PaystackConfig>(DEFAULT_CONFIG);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "paystack_config")
        .maybeSingle();
      if (data?.value) {
        setConfig({ ...DEFAULT_CONFIG, ...(data.value as any) });
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "paystack_config", value: config as any }, { onConflict: "key" });
    if (error) {
      toast({ variant: "destructive", title: "Failed to save", description: error.message });
    } else {
      toast({ title: "Payment configuration saved" });
    }
    setSaving(false);
  };

  const toggleCurrency = (code: string) => {
    setConfig((prev) => ({
      ...prev,
      supported_currencies: prev.supported_currencies.includes(code)
        ? prev.supported_currencies.filter((c) => c !== code)
        : [...prev.supported_currencies, code],
    }));
  };

  const toggleMethod = (key: string) => {
    setConfig((prev) => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(key)
        ? prev.payment_methods.filter((m) => m !== key)
        : [...prev.payment_methods, key],
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Mode & API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Paystack API Configuration
          </CardTitle>
          <CardDescription>Configure your Paystack integration keys and environment mode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label className="text-base font-medium">Environment Mode</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {config.mode === "test" ? "Using test keys — no real charges" : "Using live keys — real transactions"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={config.mode === "test" ? "secondary" : "destructive"} className="text-xs">
                {config.mode === "test" ? "TEST" : "LIVE"}
              </Badge>
              <Switch
                checked={config.mode === "live"}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, mode: checked ? "live" : "test" }))
                }
              />
            </div>
          </div>

          {config.mode === "live" && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">
                Live mode is active. Real payments will be processed. Ensure your Paystack secret key is configured in Supabase Edge Function secrets.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label>Test Public Key</Label>
              <Input
                placeholder="pk_test_..."
                value={config.public_key_test}
                onChange={(e) => setConfig((prev) => ({ ...prev, public_key_test: e.target.value }))}
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <Label>Live Public Key</Label>
              <Input
                placeholder="pk_live_..."
                value={config.public_key_live}
                onChange={(e) => setConfig((prev) => ({ ...prev, public_key_live: e.target.value }))}
                className="mt-1 font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Secret keys are stored securely in Supabase Edge Function secrets — never in the browser.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Supported Currencies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Supported Currencies
          </CardTitle>
          <CardDescription>Select which currencies patients can pay in.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CURRENCIES.map((c) => (
              <label
                key={c.code}
                className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={config.supported_currencies.includes(c.code)}
                  onCheckedChange={() => toggleCurrency(c.code)}
                />
                <div>
                  <span className="font-medium text-sm">{c.code}</span>
                  <span className="text-xs text-muted-foreground ml-1">{c.name}</span>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment Methods
          </CardTitle>
          <CardDescription>Enable or disable payment channels.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m.key}
                className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={config.payment_methods.includes(m.key)}
                  onCheckedChange={() => toggleMethod(m.key)}
                />
                <span className="text-sm font-medium">{m.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fee Bearer & Payment Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Transaction Settings
          </CardTitle>
          <CardDescription>Configure fee allocation and payment collection timing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-sm font-medium">Who Pays Transaction Fees?</Label>
            <Select
              value={config.fee_bearer}
              onValueChange={(v) => setConfig((prev) => ({ ...prev, fee_bearer: v }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEE_BEARERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">When Is Payment Required?</Label>
            <div className="mt-2 space-y-2">
              {PAYMENT_TIMINGS.map((t) => (
                <label
                  key={t.value}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    config.payment_timing === t.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="timing"
                    checked={config.payment_timing === t.value}
                    onChange={() => setConfig((prev) => ({ ...prev, payment_timing: t.value }))}
                    className="mt-1 accent-primary"
                  />
                  <div>
                    <span className="text-sm font-medium">{t.label}</span>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Platform Commission (%)</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              Percentage deducted from each doctor's consultation fee for platform usage.
            </p>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={config.platform_commission_percent}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    platform_commission_percent: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                  }))
                }
                className="w-28 font-mono"
              />
              <span className="text-sm text-muted-foreground font-medium">%</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label className="text-base font-medium">Doctor Payouts</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Enable manual payout management for doctors
              </p>
            </div>
            <Switch
              checked={config.payouts_enabled}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, payouts_enabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Payment Configuration
        </Button>
      </div>
    </div>
  );
};

export default AdminPaymentConfig;
