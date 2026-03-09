import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Plus, Trash2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { getCurrencySymbol, COUNTRY_CURRENCY } from "@/lib/currency";

interface PricingTiersProps {
  user: User;
  doctorCountry?: string | null;
}

interface Tier {
  id?: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

const PricingTiers = ({ user, doctorCountry }: PricingTiersProps) => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const currencySymbol = getCurrencySymbol(doctorCountry);

  const fetchTiers = async () => {
    const { data } = await supabase
      .from("doctor_pricing_tiers")
      .select("*")
      .eq("doctor_id", user.id)
      .order("price", { ascending: true });
    if (data) setTiers(data.map(t => ({ ...t, description: t.description || "" })));
    setLoading(false);
  };

  useEffect(() => { fetchTiers(); }, [user.id]);

  const addTier = () => {
    setTiers(prev => [...prev, { name: "", description: "", price: 0, duration_minutes: 30, is_active: true }]);
  };

  const updateTier = (index: number, updates: Partial<Tier>) => {
    setTiers(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const removeTier = async (index: number) => {
    const tier = tiers[index];
    if (tier.id) {
      await supabase.from("doctor_pricing_tiers").delete().eq("id", tier.id);
    }
    setTiers(prev => prev.filter((_, i) => i !== index));
    toast({ title: "Tier removed" });
  };

  const handleSave = async () => {
    setSaving(true);

    for (const tier of tiers) {
      if (!tier.name || tier.price <= 0) {
        toast({ variant: "destructive", title: "Each tier needs a name and a price > 0" });
        setSaving(false);
        return;
      }

      const data = {
        doctor_id: user.id,
        name: tier.name,
        description: tier.description || null,
        price: tier.price,
        duration_minutes: tier.duration_minutes,
        is_active: tier.is_active,
      };

      if (tier.id) {
        await supabase.from("doctor_pricing_tiers").update(data).eq("id", tier.id);
      } else {
        await supabase.from("doctor_pricing_tiers").insert(data);
      }
    }

    setSaving(false);
    toast({ title: "Pricing tiers saved" });
    fetchTiers();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const countryName = doctorCountry 
    ? Object.entries(COUNTRY_CURRENCY).find(([code]) => code === doctorCountry.toUpperCase())?.[0] || doctorCountry
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display">
            <DollarSign className="h-5 w-5 text-primary" /> Pricing Tiers
          </CardTitle>
          {doctorCountry && (
            <Badge variant="secondary" className="gap-1 flex items-center">
              <MapPin className="h-3.5 w-3.5" />
              {currencySymbol} Currency ({doctorCountry.toUpperCase()})
            </Badge>
          )}
        </div>
        {!doctorCountry && (
          <p className="text-xs text-muted-foreground mt-2">Please set your country in your profile to see your currency.</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {tiers.length === 0 && (
          <p className="text-sm text-muted-foreground">No pricing tiers yet. Add one below.</p>
        )}

        {tiers.map((tier, i) => (
          <div key={tier.id || i} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={tier.is_active} onCheckedChange={(v) => updateTier(i, { is_active: v })} />
                <span className="text-xs text-muted-foreground">{tier.is_active ? "Active" : "Inactive"}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeTier(i)} className="text-destructive h-8 w-8">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Tier Name</Label>
                <Input value={tier.name} onChange={(e) => updateTier(i, { name: e.target.value })} placeholder="e.g. Standard" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Price</Label>
                <Input type="number" min={0} value={tier.price} onChange={(e) => updateTier(i, { price: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" min={10} value={tier.duration_minutes} onChange={(e) => updateTier(i, { duration_minutes: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={tier.description} onChange={(e) => updateTier(i, { description: e.target.value })} rows={2} placeholder="What's included..." />
            </div>
          </div>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" onClick={addTier} className="gap-1">
            <Plus className="h-4 w-4" /> Add Tier
          </Button>
          {tiers.length > 0 && (
            <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary border-0 text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save All
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingTiers;
