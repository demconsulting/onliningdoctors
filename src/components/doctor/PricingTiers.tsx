import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, MapPin, Info, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { getCurrencySymbol, COUNTRY_CURRENCY } from "@/lib/currency";

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

const PricingTiers = ({ user, doctorCountry }: PricingTiersProps) => {
  const [categories, setCategories] = useState<ConsultationCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [price, setPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const currencySymbol = getCurrencySymbol(doctorCountry);

  useEffect(() => {
    const fetchData = async () => {
      const [catRes, docRes] = await Promise.all([
        supabase.from("consultation_categories").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("doctors").select("consultation_category_id, consultation_fee").eq("profile_id", user.id).single(),
      ]);

      if (catRes.data) setCategories(catRes.data as ConsultationCategory[]);
      if (docRes.data) {
        setSelectedCategoryId((docRes.data as any).consultation_category_id || "");
        setPrice(Number((docRes.data as any).consultation_fee) || 0);
      }
      setLoading(false);
    };
    fetchData();
  }, [user.id]);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const isPriceValid = selectedCategory
    ? price >= selectedCategory.min_price && price <= selectedCategory.max_price
    : false;

  const handleSave = async () => {
    if (!selectedCategoryId) {
      toast({ variant: "destructive", title: "Please select a consultation category" });
      return;
    }
    if (!isPriceValid) {
      toast({
        variant: "destructive",
        title: "Price out of range",
        description: `Price must be between R${selectedCategory?.min_price} and R${selectedCategory?.max_price}`,
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("doctors")
      .update({
        consultation_category_id: selectedCategoryId,
        consultation_fee: price,
      } as any)
      .eq("profile_id", user.id);

    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
    } else {
      toast({ title: "Pricing saved successfully" });
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display">
            <DollarSign className="h-5 w-5 text-primary" /> Consultation Pricing
          </CardTitle>
          {doctorCountry && (
            <Badge variant="secondary" className="gap-1 flex items-center">
              <MapPin className="h-3.5 w-3.5" />
              {currencySymbol} Currency ({doctorCountry.toUpperCase()})
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Select your consultation category and set your fee within the allowed price band.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Selection */}
        <div className="space-y-2">
          <Label>Consultation Category</Label>
          <Select value={selectedCategoryId} onValueChange={(v) => {
            setSelectedCategoryId(v);
            const cat = categories.find(c => c.id === v);
            if (cat && (price < cat.min_price || price > cat.max_price)) {
              setPrice(cat.min_price);
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name} (R{cat.min_price} – R{cat.max_price})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Description */}
        {selectedCategory && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{selectedCategory.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedCategory.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Price Band: R{selectedCategory.min_price} – R{selectedCategory.max_price}
              </Badge>
            </div>
          </div>
        )}

        {/* Price Input */}
        {selectedCategoryId && (
          <div className="space-y-2">
            <Label>Your Consultation Fee (R)</Label>
            <Input
              type="number"
              min={selectedCategory?.min_price || 0}
              max={selectedCategory?.max_price || 99999}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className={!isPriceValid && price > 0 ? "border-destructive" : ""}
            />
            {selectedCategory && !isPriceValid && price > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                Price must be between R{selectedCategory.min_price} and R{selectedCategory.max_price}
              </div>
            )}
            {selectedCategory && isPriceValid && (
              <p className="text-xs text-success">✓ Price is within the allowed range</p>
            )}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving || !selectedCategoryId || !isPriceValid}
          className="gap-2 gradient-primary border-0 text-primary-foreground"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save Pricing
        </Button>
      </CardContent>
    </Card>
  );
};

export default PricingTiers;
