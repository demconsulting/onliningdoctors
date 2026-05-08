import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, MapPin, Info, AlertTriangle, CreditCard, ShieldCheck, RefreshCw, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { getCurrencySymbol } from "@/lib/currency";

interface PricingTiersProps {
  user: User;
  doctorCountry?: string | null;
}

interface ConsultationCategory {
  id: string;
  name: string;
  description: string | null;
  min_price: number;
  max_price: number;
  is_active: boolean;
}

type TierType = "private" | "medical_aid" | "follow_up" | "specialist";

interface TierState {
  id?: string;
  tier_type: TierType;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

const TIER_META: Record<TierType, { label: string; icon: any; defaultName: string; defaultDesc: string; required?: boolean }> = {
  private: { label: "Private / Card", icon: CreditCard, defaultName: "Private / Card Consultation", defaultDesc: "Standard pay-by-card consultation", required: true },
  medical_aid: { label: "Medical Aid", icon: ShieldCheck, defaultName: "Medical Aid Consultation", defaultDesc: "Billed via medical aid (claim handled externally)" },
  follow_up: { label: "Follow-up", icon: RefreshCw, defaultName: "Follow-up Consultation", defaultDesc: "Short follow-up after a recent visit" },
  specialist: { label: "Specialist", icon: Stethoscope, defaultName: "Specialist Consultation", defaultDesc: "Sub-specialty / extended consultation" },
};

const TIER_ORDER: TierType[] = ["private", "medical_aid", "follow_up", "specialist"];

const PricingTiers = ({ user, doctorCountry }: PricingTiersProps) => {
  const [categories, setCategories] = useState<ConsultationCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [tiers, setTiers] = useState<Record<TierType, TierState>>(() => {
    const init = {} as Record<TierType, TierState>;
    TIER_ORDER.forEach(t => {
      init[t] = {
        tier_type: t,
        name: TIER_META[t].defaultName,
        description: TIER_META[t].defaultDesc,
        price: 0,
        duration_minutes: t === "follow_up" ? 15 : 30,
        is_active: t === "private",
      };
    });
    return init;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const symbol = getCurrencySymbol(doctorCountry);

  useEffect(() => {
    (async () => {
      const [catRes, docRes, tierRes] = await Promise.all([
        supabase.from("consultation_categories").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("doctors").select("consultation_category_id, consultation_fee").eq("profile_id", user.id).single(),
        supabase.from("doctor_pricing_tiers").select("*").eq("doctor_id", user.id),
      ]);
      if (catRes.data) setCategories(catRes.data as ConsultationCategory[]);
      if (docRes.data) setSelectedCategoryId((docRes.data as any).consultation_category_id || "");

      if (tierRes.data && tierRes.data.length > 0) {
        setTiers(prev => {
          const next = { ...prev };
          (tierRes.data as any[]).forEach(row => {
            const tt: TierType = (row.tier_type as TierType) || "private";
            if (!TIER_ORDER.includes(tt)) return;
            next[tt] = {
              id: row.id,
              tier_type: tt,
              name: row.name || TIER_META[tt].defaultName,
              description: row.description || TIER_META[tt].defaultDesc,
              price: Number(row.price) || 0,
              duration_minutes: row.duration_minutes ?? 30,
              is_active: row.is_active ?? true,
            };
          });
          return next;
        });
      } else if (docRes.data && (docRes.data as any).consultation_fee) {
        // Backfill private tier from legacy fee
        setTiers(prev => ({
          ...prev,
          private: { ...prev.private, price: Number((docRes.data as any).consultation_fee) || 0, is_active: true },
        }));
      }
      setLoading(false);
    })();
  }, [user.id]);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const updateTier = (t: TierType, patch: Partial<TierState>) => {
    setTiers(prev => ({ ...prev, [t]: { ...prev[t], ...patch } }));
  };

  const validateTier = (t: TierState): string | null => {
    if (!t.is_active) return null;
    if (!t.price || t.price <= 0) return "Price must be greater than 0";
    if (selectedCategory && (t.price < selectedCategory.min_price || t.price > selectedCategory.max_price)) {
      return `Must be between ${symbol}${selectedCategory.min_price} and ${symbol}${selectedCategory.max_price}`;
    }
    return null;
  };

  const handleSave = async () => {
    if (!selectedCategoryId) {
      toast({ variant: "destructive", title: "Please select a consultation category" });
      return;
    }
    if (!tiers.private.is_active) {
      toast({ variant: "destructive", title: "Private/Card consultation is required" });
      return;
    }
    for (const t of TIER_ORDER) {
      const err = validateTier(tiers[t]);
      if (err) {
        toast({ variant: "destructive", title: `${TIER_META[t].label}: ${err}` });
        return;
      }
    }

    setSaving(true);
    try {
      // Upsert each tier
      for (const t of TIER_ORDER) {
        const tier = tiers[t];
        const payload: any = {
          doctor_id: user.id,
          tier_type: t,
          name: tier.name,
          description: tier.description,
          price: tier.price,
          duration_minutes: tier.duration_minutes,
          is_active: tier.is_active,
        };
        if (tier.id) {
          await supabase.from("doctor_pricing_tiers").update(payload).eq("id", tier.id);
        } else if (tier.is_active || tier.price > 0) {
          await supabase.from("doctor_pricing_tiers").insert(payload);
        }
      }

      // Sync doctors.consultation_fee = lowest active tier price (preserves directory listing)
      const activePrices = TIER_ORDER.filter(t => tiers[t].is_active && tiers[t].price > 0).map(t => tiers[t].price);
      const lowest = activePrices.length ? Math.min(...activePrices) : tiers.private.price;
      await supabase.from("doctors").update({
        consultation_category_id: selectedCategoryId,
        consultation_fee: lowest,
      } as any).eq("profile_id", user.id);

      toast({ title: "Pricing saved", description: "Your consultation fees are updated." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 font-display">
              <DollarSign className="h-5 w-5 text-primary" /> Consultation Pricing
            </CardTitle>
            {doctorCountry && (
              <Badge variant="secondary" className="gap-1 flex items-center">
                <MapPin className="h-3.5 w-3.5" />
                {symbol} ({doctorCountry.toUpperCase()})
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Set separate fees for each consultation type. Patients see the matching fee based on how they choose to pay.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Consultation Category</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name} ({symbol}{cat.min_price} – {symbol}{cat.max_price})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedCategory && (
            <div className="rounded-lg border bg-muted/30 p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{selectedCategory.name}</span> — prices must be between{" "}
                <strong>{symbol}{selectedCategory.min_price}</strong> and <strong>{symbol}{selectedCategory.max_price}</strong>.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {TIER_ORDER.map(t => {
          const meta = TIER_META[t];
          const tier = tiers[t];
          const Icon = meta.icon;
          const err = validateTier(tier);
          return (
            <Card key={t} className={tier.is_active ? "border-primary/30" : "opacity-80"}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
                    <div>
                      <CardTitle className="text-base">{meta.label}</CardTitle>
                      {meta.required && <Badge variant="secondary" className="mt-0.5 text-[10px]">Required</Badge>}
                    </div>
                  </div>
                  <Switch
                    checked={tier.is_active}
                    onCheckedChange={(v) => updateTier(t, { is_active: meta.required ? true : v })}
                    disabled={meta.required}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Price ({symbol})</Label>
                  <Input
                    type="number"
                    min={0}
                    value={tier.price || ""}
                    onChange={(e) => updateTier(t, { price: Number(e.target.value) })}
                    className={err && tier.is_active ? "border-destructive" : ""}
                    disabled={!tier.is_active}
                    placeholder="0"
                  />
                  {err && tier.is_active && (
                    <div className="flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="h-3 w-3" /> {err}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Duration (minutes)</Label>
                  <Select
                    value={String(tier.duration_minutes)}
                    onValueChange={(v) => updateTier(t, { duration_minutes: Number(v) })}
                    disabled={!tier.is_active}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 15, 20, 30, 45, 60].map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={tier.description}
                    onChange={(e) => updateTier(t, { description: e.target.value })}
                    disabled={!tier.is_active}
                    maxLength={120}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-lg border border-dashed p-4 bg-muted/30 text-xs text-muted-foreground">
        <strong className="text-foreground">Medical Aid note:</strong> The platform records the patient's intent to use medical aid and tracks the consultation status.
        Doctors/practices handle the actual claim submission externally during Phase 1.
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary border-0 text-primary-foreground">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Pricing
        </Button>
      </div>
    </div>
  );
};

export default PricingTiers;
